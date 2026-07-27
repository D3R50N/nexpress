import dotenv from "dotenv";
import express, { Express } from "express";
import fs from "fs";
import { Server } from "http";
import path from "path";
import { registerComponents, renderComponent } from "./components";
import { builtinHelpers, registerBuiltinHelpers } from "./helpers";
import { registerRoutes } from "./router";

import { logger } from "./logger";
import { compileTailwindCss, TailwindOptions } from "./tailwind";

export type TemplateEngine = "hbs" | "ejs" | "html";

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
    dotenv.config({ path: envPath });
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

  const rawEngine = options.engine || "hbs";
  const engine = rawEngine.toLowerCase() as TemplateEngine;
  const allowedEngines: TemplateEngine[] = ["hbs", "ejs", "html"];

  if (!allowedEngines.includes(engine)) {
    throw new Error(
      `[nxpress] Unsupported template engine: "${rawEngine}". Allowed engines are: hbs, ejs, html`,
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

    res.locals.tailwindCssUrl = tailwindCssUrl;
    res.locals.tailwind = `<link rel="stylesheet" href="${tailwindCssUrl}"/>`;
    res.locals.year = now.getFullYear();
    res.locals.now = now;
    res.locals.E = process.env;
    res.locals.env = process.env;
    res.locals.G = globalObj;
    res.locals.global = globalObj;
    res.locals.R = req;
    res.locals.req = req;
    res.locals.$ = (name: string, props: Record<string, any> = {}) =>
      renderComponent(name, props, res.locals);
    Object.assign(res.locals, builtinHelpers);

    next();
  });

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  registerComponents(componentsDir);
  registerRoutes(app, appDir, { engine, globals: options.globals, rootDir });

  return app;
}

/**
 * Starts the Nxpress server on specified port.
 */
export function serve(
  options: NxpressServerOptions = {},
  log: boolean = true,
): Server {
  const port = options.port || Number(process.env.PORT) || 3000;
  const app = nxpress(options);

  return app.listen(port, () => {
    if (log) {
      logger.serverRunning(port);
    }
  });
}
