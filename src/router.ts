import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { Express, Request, Response, RequestHandler } from "express";
import hbs from "hbs";
import { Eta } from "eta";
import nunjucks from "nunjucks";
import { Liquid } from "liquidjs";
import { createJiti } from "jiti";
import { logger } from "./logger";
import { injectTailwindCss } from "./tailwind";
import { injectLiveReloadScript } from "./liveReload";
import { isDevMode } from "./env";
import {
  builtinHelpers,
  ejsToEta,
  registerBuiltinHelpers,
  registerLiquidFilters,
  registerNunjucksHelpers,
} from "./helpers";

const etaEngine = new Eta({
  useWith: true,
});
const liquidEngine = new Liquid();

registerLiquidFilters(liquidEngine);
try {
  registerNunjucksHelpers(nunjucks);
} catch (_e) {}

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
  isDev?: boolean;
}

/**
 * Renders a single template file with given props for EJS (Eta), Nunjucks, Liquid, HBS, HTML.
 */
export function renderTemplateFile(
  filePath: string,
  props: Record<string, any>,
): string {
  const content = fs.readFileSync(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ejs") {
    return etaEngine.renderString(ejsToEta(content), props);
  }

  if (ext === ".njk" || ext === ".nunjucks") {
    return nunjucks.renderString(content, props);
  }

  if (ext === ".liquid") {
    return liquidEngine.parseAndRenderSync(content, props);
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
  engine: string = "ejs",
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
    targetExts = [".ejs", ".html"];
  } else if (engine === "njk" || engine === "nunjucks") {
    targetExts = [".njk", ".nunjucks", ".html"];
  } else if (engine === "liquid") {
    targetExts = [".liquid", ".html"];
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
    /\.(hbs|ejs|html|eta|liquid|nunjucks|njk|pug|mustache|js|ts)$/i,
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
  const engine = options.engine || "ejs";
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

  if (res.locals.R && typeof res.locals.R === "object") {
    res.locals.R.params = req.params || {};
  }

  const tailwindCssUrl = res.locals.tailwindCssUrl || "/tailwind.css";

  const mergedProps = { ...options.globals, ...res.locals, ...pageProps };
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
      logger.warn(`Reserved key "${key}" in props() was overridden by system.`);
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

    let finalHtml = injectTailwindCss(renderedHtml, tailwindCssUrl);
    if (isDevMode(options)) {
      finalHtml = injectLiveReloadScript(finalHtml);
    }
    res.send(finalHtml);
  } catch (err: any) {
    logger.error(`Error rendering page/layout for ${templateFile}:`, err);
    if (!res.headersSent) {
      if (isDevMode(options)) {
        res.status(500).send(formatDev500ErrorHtml(err));
      } else {
        res.status(500).send("Internal Server Error");
      }
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

  // Build targeted glob pattern matching only engine extensions & API/companion JS/TS files
  let globPattern = getFilesPattern(options.engine);

  const files = globSync(globPattern, {
    cwd: appDir,
    nodir: true,
  });

  const apiFiles: string[] = [];
  const pageFiles: string[] = [];

  files.forEach((file) => {
    if (file.startsWith("api/") || file.startsWith("api\\")) {
      apiFiles.push(file);
    } else {
      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);
      if (baseName !== "layout" && ext !== ".js" && ext !== ".ts") {
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
    return (
      base !== "404" &&
      base !== "500" &&
      base !== "not-found" &&
      base !== "error"
    );
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
      return renderPageView(
        req,
        res,
        custom404,
        404,
        { title: "404" },
        options,
        appDir,
      );
    }

    let html404 = `<!DOCTYPE html>
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
</html>`;
    if (isDevMode(options)) {
      html404 = injectLiveReloadScript(html404);
    }
    res.status(404).send(html404);
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
        { title: "500", error: err?.message || String(err) },
        options,
        appDir,
      );
    }

    if (isDevMode(options)) {
      return res.status(500).send(formatDev500ErrorHtml(err));
    }

    let html500 = `<!DOCTYPE html>
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
</html>`;
    res.status(500).send(html500);
  });
}

export function getFilesPattern(optionsEngine?: string) {
  if (!optionsEngine) {
    return "**/*.{hbs,html,ejs,pug,mustache,njk,nunjucks,liquid,js,ts}";
  }
  const engine = optionsEngine.toLowerCase();

  let globPattern = `**/*.{${engine},js,ts}`;
  if (engine === "ejs") {
    globPattern = "**/*.{ejs,js,ts}";
  } else if (engine === "hbs") {
    globPattern = "**/*.{hbs,js,ts}";
  } else if (engine === "njk" || engine === "nunjucks") {
    globPattern = "**/*.{njk,nunjucks,js,ts}";
  } else if (engine === "liquid") {
    globPattern = "**/*.{liquid,js,ts}";
  } else if (engine === "html") {
    globPattern = "**/*.{html,htm,js,ts}";
  }
  return globPattern;
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDev500ErrorHtml(err: any): string {
  const message = err?.message || String(err || "Unknown Error");
  const stack = err?.stack || String(err || "");
  const name = err?.name || "Runtime Error";

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} - ${escapeHtml(message)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b0f19;
      color: #f8fafc;
      margin: 0;
      padding: 2rem;
      box-sizing: border-box;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      width: 100%;
      max-width: 900px;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #02FAFC;
      margin: 0 0 1rem 0;
      line-height: 1.3;
      word-break: break-word;
    }
    pre {
      background: #030712;
      border: 1px solid #1f2937;
      color: #cbd5e1;
      padding: 1.25rem;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">500 ${escapeHtml(name)}</span>
    <h1>${escapeHtml(message)}</h1>
    <pre>${escapeHtml(stack)}</pre>
  </div>
</body>
</html>`;

  return injectLiveReloadScript(html);
}
