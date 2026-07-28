import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { Express, Request, Response, RequestHandler } from "express";
import hbs from "hbs";
import ejs from "ejs";
import { createJiti } from "jiti";
import { logger } from "./logger";
import { injectTailwindCss } from "./tailwind";

const jitiLoader = createJiti(__filename, {
  cache: false,
  requireCache: false,
});

export interface NxpressDataModule {
  props?: (
    req: Request,
    res: Response,
  ) => Promise<Record<string, any>> | Record<string, any>;
  default?: (
    req: Request,
    res: Response,
  ) => Promise<Record<string, any>> | Record<string, any>;
}

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export interface RouterOptions {
  rootDir?: string;
  pagesDir?: string;
  engine?: string;
  globals?: Record<string, any>;
}

/**
 * Renders a single template file with given props for HBS, EJS, HTML.
 */
export function renderTemplateFile(
  filePath: string,
  props: Record<string, any>,
): string {
  const content = fs.readFileSync(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".ejs") {
    return ejs.render(content, props, { filename: filePath });
  }

  // Handlebars default
  const template = hbs.handlebars.compile(content);
  return template(props);
}

/**
 * Discovers matching nested layout files for a route from inner to outer directory.
 */
export function findLayoutsForRoute(
  rootDir: string,
  appDir: string,
  templateRelPath: string,
  engine: string = "hbs",
): string[] {
  const fileExt = path.extname(templateRelPath).toLowerCase();
  const baseName = path.basename(templateRelPath, fileExt);

  // If rendering a layout file itself, return no layouts
  if (baseName === "layout") {
    return [];
  }

  // Determine target layout extensions based on engine & file extension
  let targetExts: string[] = [fileExt];
  if (engine === "ejs") {
    targetExts = [".ejs"];
  } else if (engine === "hbs") {
    targetExts = [".hbs"];
  } else if (engine === "html") {
    targetExts = [".html", ".htm"];
  }

  const layouts: string[] = [];

  // Build candidate directories from innermost sub-folder up to rootDir
  const searchDirs: string[] = [];
  const dirParts = path
    .dirname(templateRelPath)
    .split(/[/\\]/)
    .filter((p) => p !== "." && p !== "");

  for (let i = dirParts.length; i >= 0; i--) {
    const subDir = dirParts.slice(0, i).join("/");
    searchDirs.push(path.join(appDir, subDir));
  }

  searchDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;

    for (const extCandidate of targetExts) {
      const layoutFile = path.join(dir, `layout${extCandidate}`);
      if (fs.existsSync(layoutFile) && !layouts.includes(layoutFile)) {
        layouts.push(layoutFile);
        break;
      }
    }
  });

  return layouts;
}

/**
 * Converts a page file relative path into an Express route pattern.
 */
export function fileToRoutePath(relPath: string): string {
  let routePath = relPath.replace(
    /\.(hbs|ejs|html|pug|mustache|njk|js|ts)$/,
    "",
  );

  if (routePath === "index" || routePath.endsWith("/index")) {
    routePath = routePath.replace(/\/index$/, "").replace(/^index$/, "");
  }

  routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, "*");
  routePath = routePath.replace(/\[([^\]]+)\]/g, ":$1");

  if (!routePath.startsWith("/")) {
    routePath = "/" + routePath;
  }

  return routePath;
}

/**
 * Renders a page view with its companion file, layout, and props.
 */
export async function renderPageView(
  req: Request,
  res: Response,
  templateFile: string,
  statusCode: number = 200,
  extraProps: Record<string, any> = {},
  options: RouterOptions = {},
  appDir: string = "",
): Promise<void> {
  res.status(statusCode);

  const rootDir = options.rootDir || process.cwd();
  const engine = options.engine || "hbs";
  let pageProps: Record<string, any> = { ...extraProps };

  const companionTsFile = path.resolve(
    appDir,
    templateFile.replace(/\.[^.]+$/, ".ts"),
  );
  const companionJsFile = path.resolve(
    appDir,
    templateFile.replace(/\.[^.]+$/, ".js"),
  );

  let companionPath: string | null = null;
  if (fs.existsSync(companionTsFile)) {
    companionPath = companionTsFile;
  } else if (fs.existsSync(companionJsFile)) {
    companionPath = companionJsFile;
  }

  if (companionPath) {
    try {
      let dataModule: any;
      try {
        dataModule = await jitiLoader.import(companionPath);
      } catch (importErr) {
        dataModule = jitiLoader(companionPath);
      }

      let propsFn: any = null;
      if (typeof dataModule.props === "function") {
        propsFn = dataModule.props;
      } else if (
        dataModule.default &&
        typeof dataModule.default.props === "function"
      ) {
        propsFn = dataModule.default.props;
      } else if (typeof dataModule.default === "function") {
        propsFn = dataModule.default;
      } else if (typeof dataModule === "function") {
        propsFn = dataModule;
      }

      if (propsFn) {
        const result = await propsFn(req, res);
        pageProps = { ...pageProps, ...result };
      }
    } catch (err) {
      logger.error(`Error executing companion file for ${templateFile}:`, err);
    }
  }

  if (res.headersSent) return;

  const tailwindCssUrl = res.locals.tailwindCssUrl || "/tailwind.css";

  const mergedProps = { ...res.locals, ...pageProps };
  const systemReservedKeys = [
    "G",
    "global",
    "R",
    "req",
    "E",
    "env",
    "$",
    "tailwind",
  ];
  for (const key of systemReservedKeys) {
    if (key in pageProps) {
      logger.warn(
        `Reserved key "${key}" in props() was overridden by system.`,
      );
    }
    mergedProps[key] = res.locals[key];
  }

  const templateFullPath = path.resolve(appDir, templateFile);
  const layouts = findLayoutsForRoute(rootDir, appDir, templateFile, engine);

  const viewPath = templateFile.replace(/\.[^.]+$/, "");
  if (layouts.length === 0) {
    return res.render(viewPath, mergedProps);
  }

  try {
    let renderedHtml = renderTemplateFile(templateFullPath, mergedProps);

    for (const layoutPath of layouts) {
      renderedHtml = renderTemplateFile(layoutPath, {
        ...mergedProps,
        body: renderedHtml,
      });
    }

    res.send(injectTailwindCss(renderedHtml, tailwindCssUrl));
  } catch (err) {
    logger.error(`Error rendering page/layout for ${templateFile}:`, err);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
}

/**
 * Registers all file-based routes from the app directory onto an Express app.
 */
export function registerRoutes(
  app: Express,
  appDir: string,
  options: RouterOptions = {},
): void {
  if (!fs.existsSync(appDir)) {
    logger.warn(`Directory "${appDir}" does not exist.`);
    return;
  }

  const rootDir = options.rootDir || process.cwd();
  const engine = options.engine || "hbs";

  const files = globSync("**/*.{hbs,html,ejs,pug,mustache,njk,js,ts}", {
    cwd: appDir,
  });

  const apiFiles: string[] = [];
  const pageFiles: string[] = [];

  files.forEach((file) => {
    if (file.startsWith("api/") || file.startsWith("api\\")) {
      apiFiles.push(file);
    } else {
      const baseName = path.basename(file, path.extname(file));
      if (baseName !== "layout") {
        pageFiles.push(file);
      }
    }
  });

  // 1. Register API Routes
  apiFiles.forEach((file) => {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) return;

    const fullPath = path.resolve(appDir, file);
    const routePath = fileToRoutePath(file);

    delete require.cache[require.resolve(fullPath)];
    const routeModule = require(fullPath);

    const methods: HttpMethod[] = ["get", "post", "put", "delete", "patch"];
    let registered = false;

    methods.forEach((method) => {
      if (typeof routeModule[method] === "function") {
        app[method](routePath, routeModule[method]);
        registered = true;
      }
    });

    if (!registered) {
      const defaultHandler = routeModule.default || routeModule;
      if (typeof defaultHandler === "function") {
        app.all(routePath, defaultHandler);
      }
    }
  });

  // 2. Register Page View Routes
  const templateFiles = pageFiles.filter((f) => {
    if (f.endsWith(".js") || f.endsWith(".ts")) return false;
    const base = path.basename(f, path.extname(f));
    return base !== "404" && base !== "500" && base !== "not-found" && base !== "error";
  });

  templateFiles.forEach((templateFile) => {
    const routePath = fileToRoutePath(templateFile);

    const handler: RequestHandler = async (req: Request, res: Response) => {
      try {
        await renderPageView(req, res, templateFile, 200, {}, options, appDir);
      } catch (err) {
        logger.error(`Error handling route ${routePath}:`, err);
        if (!res.headersSent) {
          res.status(500).send("Internal Server Error");
        }
      }
    };

    app.get(routePath, handler);
  });

  // 3. Catch-all 404 Handler
  app.use(async (req: Request, res: Response) => {
    const custom404 = pageFiles.find((f) => {
      if (f.endsWith(".js") || f.endsWith(".ts")) return false;
      const base = path.basename(f, path.extname(f));
      return base === "404" || base === "not-found";
    });

    if (custom404) {
      return renderPageView(req, res, custom404, 404, {}, options, appDir);
    }

    res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 Not Found</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #000000; color: #02FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center;">
    <h1 style="font-size: 6rem; font-weight: 900; margin: 0; color: #02FAFC; letter-spacing: -0.05em;">404</h1>
    <p style="font-size: 1.75rem; font-weight: 600; color: #02FAFC; margin-top: 0.5rem; opacity: 0.9;">Page Not Found</p>
  </div>
</body>
</html>`);
  });

  // 4. Global 500 Error Handler
  app.use(async (err: any, req: Request, res: Response, next: any) => {
    logger.error("Server Error:", err);

    const custom500 = pageFiles.find((f) => {
      if (f.endsWith(".js") || f.endsWith(".ts")) return false;
      const base = path.basename(f, path.extname(f));
      return base === "500" || base === "error";
    });

    if (custom500) {
      return renderPageView(
        req,
        res,
        custom500,
        500,
        { error: err?.message || String(err) },
        options,
        appDir,
      );
    }

    res.status(500).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>500 Internal Server Error</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #000000; color: #02FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center;">
    <h1 style="font-size: 6rem; font-weight: 900; margin: 0; color: #02FAFC; letter-spacing: -0.05em;">500</h1>
    <p style="font-size: 1.75rem; font-weight: 600; color: #02FAFC; margin-top: 0.5rem; opacity: 0.9;">Internal Server Error</p>
  </div>
</body>
</html>`);
  });
}
