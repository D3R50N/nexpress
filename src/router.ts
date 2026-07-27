import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { Express, Request, Response, RequestHandler } from "express";
import hbs from "hbs";
import ejs from "ejs";
import { logger } from "./logger";
import { injectTailwindCss } from "./tailwind";

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
  const templateFiles = pageFiles.filter(
    (f) => !f.endsWith(".js") && !f.endsWith(".ts"),
  );

  templateFiles.forEach((templateFile) => {
    const routePath = fileToRoutePath(templateFile);
    const viewPath = templateFile.replace(/\.[^.]+$/, "");

    const companionTsFile = templateFile.replace(/\.[^.]+$/, ".ts");
    const companionJsFile = templateFile.replace(/\.[^.]+$/, ".js");

    let companionFullPath: string | null = null;
    if (fs.existsSync(path.resolve(appDir, companionTsFile))) {
      companionFullPath = path.resolve(appDir, companionTsFile);
    } else if (fs.existsSync(path.resolve(appDir, companionJsFile))) {
      companionFullPath = path.resolve(appDir, companionJsFile);
    }

    const handler: RequestHandler = async (req: Request, res: Response) => {
      let pageProps: Record<string, any> = {};

      if (companionFullPath) {
        try {
          delete require.cache[require.resolve(companionFullPath)];
          const dataModule: NxpressDataModule = require(companionFullPath);

          if (typeof dataModule.props === "function") {
            pageProps = await dataModule.props(req, res);
          } else if (typeof dataModule.default === "function") {
            pageProps = await dataModule.default(req, res);
          } else if (typeof dataModule === "function") {
            pageProps = await (dataModule as Function)(req, res);
          }
        } catch (err) {
          logger.error(
            `Error executing companion file for ${templateFile}:`,
            err,
          );
          return res.status(500).send("Internal Server Error");
        }
      }

      if (res.headersSent) return;

      const tailwindCssUrl = res.locals.tailwindCssUrl || "/tailwind.css";
      delete res.locals.tailwindCssUrl;

      const mergedProps = { ...res.locals, ...pageProps };
      const systemReservedKeys = ['G', 'global', 'R', 'req', 'E', 'env', '$', 'tailwind'];
      for (const key of systemReservedKeys) {
        if (key in pageProps) {
          logger.warn(`Reserved key "${key}" in props() was overridden by system.`);
        }
        mergedProps[key] = res.locals[key];
      }
      const templateFullPath = path.resolve(appDir, templateFile);
      const layouts = findLayoutsForRoute(
        rootDir,
        appDir,
        templateFile,
        engine,
      );

      if (layouts.length === 0) {
        return res.render(viewPath, mergedProps);
      }

      try {
        let renderedHtml = renderTemplateFile(templateFullPath, mergedProps);

        // Wrap from innermost to outermost layout
        for (const layoutPath of layouts) {
          renderedHtml = renderTemplateFile(layoutPath, {
            ...mergedProps,
            body: renderedHtml,
          });
        }

        res.send(injectTailwindCss(renderedHtml, tailwindCssUrl));
      } catch (err) {
        logger.error(`Error rendering page/layout for ${templateFile}:`, err);
        res.status(500).send("Internal Server Error");
      }
    };

    app.get(routePath, handler);
  });
}
