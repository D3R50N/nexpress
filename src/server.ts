import chokidar from "chokidar";
import dotenv from "dotenv";
import express, { Express } from "express";
import fs from "fs";
import { Server } from "http";
import path from "path";
import { registerComponents, renderComponent } from "./components";
import { builtinHelpers, registerBuiltinHelpers } from "./helpers";
import { registerRoutes } from "./router";

import { logger } from "./logger";
import {
  compileTailwindCss,
  getTailwindOutputInfo,
  TailwindOptions,
} from "./tailwind";
import {
  handleLiveReloadRoute,
  notifyLiveReload,
  LIVE_RELOAD_SCRIPT,
} from "./liveReload";
import { getFilteredEnv, isDevMode } from "./env";

export type TemplateEngine = "ejs" | "hbs" | "html" | "nunjucks" | "liquid";

export interface NxpressServerOptions {
  rootDir?: string;
  appDir?: string;
  pagesDir?: string;
  componentsDir?: string;
  publicDir?: string;
  engine?: TemplateEngine;
  port?: number;
  tailwind?: boolean | TailwindOptions;
  globals?: Record<string, any>;
  isDev?: boolean;
  secureEnv?: boolean;
}

/**
 * Creates and configures the Nxpress Express app.
 */
export function nxpress(options: NxpressServerOptions = {}): Express {
  const app = express();
  const rootDir = options.rootDir || process.cwd();

  // Load .env file from rootDir if available
  const envPath = path.join(rootDir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, quiet: true, override: true });
  }
  const publicDir = options.publicDir || path.join(rootDir, "public");

  // Enable Tailwind by default unless explicitly set to false
  let tailwindCssUrl = "/tailwind.css";
  const hasTailwindConfig = options.tailwind !== false;

  if (hasTailwindConfig) {
    const twOpts = typeof options.tailwind === "object" ? options.tailwind : {};
    tailwindCssUrl = compileTailwindCss(rootDir, publicDir, twOpts);
  }

  const appDir =
    options.appDir ||
    options.pagesDir ||
    (fs.existsSync(path.join(rootDir, "app"))
      ? path.join(rootDir, "app")
      : path.join(rootDir, "pages"));
  const componentsDir =
    options.componentsDir || path.join(rootDir, "components");

  const rawEngine = options.engine || "ejs";
  const engine = rawEngine.toLowerCase() as TemplateEngine;
  const allowedEngines: TemplateEngine[] = [
    "ejs",
    "hbs",
    "html",
    "nunjucks",
    "liquid",
  ];

  if (!allowedEngines.includes(engine)) {
    throw new Error(
      `[nxpress] Unsupported template engine: "${rawEngine}". Allowed engines are: ejs, hbs, html, nunjucks, liquid`,
    );
  }

  app.set("view engine", engine);
  app.set("views", [appDir, componentsDir, rootDir]);

  if (engine === "hbs") {
    registerBuiltinHelpers();
  } else if (engine === "html") {
    const htmlRenderer = (filePath: string, _opts: any, callback: any) => {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        callback(null, content);
      } catch (err) {
        callback(err);
      }
    };
    app.engine("html", htmlRenderer);
    app.engine("htm", htmlRenderer);
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Middleware injecting automatic global template variables
  app.use((req, res, next) => {
    const now = new Date();
    const globalObj = {
      $: renderComponent,
      ...builtinHelpers,
      ...(options.globals || {}),
    };

    const protocol = req.protocol || "http";
    const host = req.get("host") || "";
    const fullBaseUrl = host ? `${protocol}://${host}` : "";
    const full = host
      ? `${protocol}://${host}${req.originalUrl || req.url}`
      : req.originalUrl || req.url;

    const requestObj = {
      url: req.originalUrl || req.url,
      path: req.path,
      full,
      base: fullBaseUrl,
      method: req.method,
      query: req.query || {},
      params: req.params || {},
      headers: req.headers || {},
      cookies: (req as any).cookies || {},
      ip: req.ip,
      protocol,
      host,
    };

    res.locals.tailwindCssUrl = tailwindCssUrl;
    res.locals.tailwind = `<link rel="stylesheet" href="${tailwindCssUrl}"/>`;
    res.locals.year = now.getFullYear();
    res.locals.now = now;
    const envObj = getFilteredEnv(options.secureEnv);
    res.locals.E = envObj;
    res.locals.env = envObj;
    res.locals.G = globalObj;
    res.locals.global = globalObj;
    res.locals.R = requestObj;
    res.locals.req = requestObj;
    res.locals.$ = (name: string, props: Record<string, any> = {}) =>
      renderComponent(name, props, res.locals);
    Object.assign(res.locals, builtinHelpers);

    next();
  });

  app.get("/nxpress/live-reload", handleLiveReloadRoute);

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  registerComponents(componentsDir, options);
  registerRoutes(app, appDir, {
    engine,
    globals: options.globals,
    rootDir,
    isDev: options.isDev,
  });

  const originalListen = app.listen.bind(app);
  let watcherStarted = false;

  app.listen = function (...args: any[]) {
    if (isDevMode(options) && !watcherStarted) {
      watcherStarted = true;
      setupDevWatcher(options);
    }
    return originalListen(...args);
  } as any;

  return app;
}

/**
 * Sets up background file watching for live reload and cache clearing in development mode.
 */
function setupDevWatcher(options: NxpressServerOptions): void {
  const rootDir = options.rootDir || process.cwd();
  const appDir = options.appDir || path.join(rootDir, "app");
  const componentsDir =
    options.componentsDir || path.join(rootDir, "components");
  const publicDir = options.publicDir || path.join(rootDir, "public");

  const tailwindOptions =
    typeof options.tailwind === "object" ? options.tailwind : {};
  const tailwindInput = tailwindOptions.input
    ? path.resolve(rootDir, tailwindOptions.input)
    : path.join(rootDir, "app.css");

  const { outputCss: tailwindOutput } = getTailwindOutputInfo(
    rootDir,
    publicDir,
    tailwindOptions,
  );

  const watchTargets = [
    appDir,
    componentsDir,
    publicDir,
    tailwindInput,
    path.join(rootDir, ".env"),
    path.join(rootDir, "nxpress.config.json"),
    path.join(rootDir, "nxpress.config.js"),
    path.join(rootDir, "nxpress.config.ts"),
  ].filter((target) => fs.existsSync(target));

  const watcher = chokidar.watch(watchTargets, {
    ignored: [tailwindOutput, "**/*.map"],
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 5,
    },
  });

  watcher.on("all", (_event, filePath) => {
    const filename = path.basename(filePath);

    if (
      filePath === tailwindOutput ||
      path.resolve(filePath) === path.resolve(tailwindOutput) ||
      filename === "tailwind.css"
    ) {
      return;
    }

    const relPath = path.relative(rootDir, filePath);

    try {
      const resolved = require.resolve(filePath);
      delete require.cache[resolved];
    } catch (e) {}
    try {
      delete require.cache[filePath];
    } catch (e) {}
    try {
      if (fs.existsSync(filePath)) {
        delete require.cache[fs.realpathSync(filePath)];
      }
    } catch (e) {}

    if (filePath.startsWith(componentsDir)) {
      registerComponents(componentsDir, options);
    }

    if (options.tailwind !== false) {
      compileTailwindCss(rootDir, publicDir, tailwindOptions);
    }

    logger.info(`File changed \`${relPath}\``);
    notifyLiveReload();
  });
}

/**
 * Starts the Nxpress server on specified port.
 */
export function serve(
  options: NxpressServerOptions = {},
  log: boolean = true,
): Server {
  const isDev = isDevMode(options);
  options.isDev = isDev;

  const port = options.port || Number(process.env.PORT) || 3000;
  const app = nxpress(options);

  const server = app.listen(port, () => {
    if (log) {
      logger.serverRunning(port);
    }
  });

  if (isDev && process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (key: string) => {
        if (key === "\u0003" || key === "\u0004") {
          process.exit(0);
        }
        if (key.toLowerCase() === "r" || key.trim().toLowerCase() === "rs") {
          logger.warn("Manual reload triggered");
          notifyLiveReload();
        }
      });
    } catch (e) {}
  }

  return server;
}
