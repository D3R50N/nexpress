#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import { startServer, NxpressServerOptions } from "../server";
import { logger } from "../logger";

function getNxpressVersion(): string {
  try {
    const candidates = [
      path.resolve(__dirname, "../package.json"),
      path.resolve(__dirname, "../../package.json"),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
        if (pkg.version) {
          return pkg.version;
        }
      }
    }
  } catch (e) {}
  return "1.0.0";
}

const program = new Command();

program
  .name("nxpress")
  .description(
    "Next.js-like Express framework with file routing & template components",
  )
  .version(getNxpressVersion(), "-v, -V, --version");

function loadConfigFile(rootDir: string): Record<string, any> {
  const jsonConfig = path.join(rootDir, "nxpress.config.json");
  if (fs.existsSync(jsonConfig)) {
    try {
      return JSON.parse(fs.readFileSync(jsonConfig, "utf8"));
    } catch (e) {
      logger.warn("Failed to parse nxpress.config.json");
    }
  }

  const jsConfig = path.join(rootDir, "nxpress.config.js");
  if (fs.existsSync(jsConfig)) {
    try {
      delete require.cache[require.resolve(jsConfig)];
      const loaded = require(jsConfig);
      return loaded.default || loaded;
    } catch (e) {
      logger.warn("Failed to load nxpress.config.js");
    }
  }

  return {};
}

function resolveServerOptions(
  cmdOptions: Record<string, any>,
): NxpressServerOptions {
  const rootDir = cmdOptions.rootDir
    ? path.resolve(cmdOptions.rootDir)
    : process.cwd();
  const fileConfig = loadConfigFile(rootDir);

  const engine = cmdOptions.engine || fileConfig.engine || "hbs";
  const port = cmdOptions.port
    ? parseInt(cmdOptions.port, 10)
    : fileConfig.port || 3000;

  return {
    rootDir,
    port,
    engine,
    appDir: cmdOptions.appDir
      ? path.resolve(rootDir, cmdOptions.appDir)
      : fileConfig.appDir,
    componentsDir: cmdOptions.componentsDir
      ? path.resolve(rootDir, cmdOptions.componentsDir)
      : fileConfig.componentsDir,
    publicDir: cmdOptions.publicDir
      ? path.resolve(rootDir, cmdOptions.publicDir)
      : fileConfig.publicDir,
    tailwind: cmdOptions.tailwind ?? fileConfig.tailwind ?? true,
    globals: fileConfig.globals || {},
  };
}

program
  .command("dev")
  .description("Start the development server with live reloader")
  .option("-p, --port <number>", "Port number")
  .option("-e, --engine <engine>", "Template engine (hbs, ejs, html)")
  .option("-a, --app-dir <dir>", "Custom app directory")
  .option("-c, --components-dir <dir>", "Custom components directory")
  .option("--public-dir <dir>", "Custom public directory")
  .option("-r, --root-dir <dir>", "Custom root directory")
  .option("-t, --tailwind", "Enable automatic Tailwind CSS compilation")
  .action((cmdOptions) => {
    const options = resolveServerOptions(cmdOptions);
    logger.info(`Starting dev server...`);

    let currentServer = startServer(options);
    let oldOptions: NxpressServerOptions = options;

    const rootDir = options.rootDir || process.cwd();
    const appDir = options.appDir || path.join(rootDir, "app");
    const componentsDir =
      options.componentsDir || path.join(rootDir, "components");
    const publicDir = options.publicDir || path.join(rootDir, "public");

    const watchTargets = [
      appDir,
      componentsDir,
      publicDir,
      path.join(rootDir, ".env"),
      path.join(rootDir, "nxpress.config.json"),
      path.join(rootDir, "nxpress.config.js"),
    ].filter((target) => fs.existsSync(target));

    const watcher = chokidar.watch(watchTargets, {
      ignored: ["**/public/tailwind.css", "**/tailwind.css", "**/*.map"],
      ignoreInitial: true,
      interval: 500,
    });
    let isReloading = false; //prevent double reload

    watcher.on("all", (event, filePath) => {
      if (isReloading) return;
      isReloading = true;
      logger.warn(
        `File changed (${path.relative(rootDir, filePath)}). Reloading...`,
      );
      currentServer.close(() => {
        Object.keys(require.cache).forEach((key) => {
          if (key.startsWith(rootDir)) {
            delete require.cache[key];
          }
        });
        const freshOptions = resolveServerOptions(cmdOptions);

        currentServer = startServer(
          freshOptions,
          oldOptions.port != freshOptions.port,
        );
        oldOptions = freshOptions;
        isReloading = false;
      });
    });
  });

program
  .command("start")
  .description("Start the production server")
  .option("-p, --port <number>", "Port number")
  .option("-e, --engine <engine>", "Template engine (hbs, ejs, html)")
  .option("-a, --app-dir <dir>", "Custom app directory")
  .option("-c, --components-dir <dir>", "Custom components directory")
  .option("--public-dir <dir>", "Custom public directory")
  .option("-r, --root-dir <dir>", "Custom root directory")
  .action((cmdOptions) => {
    const options = resolveServerOptions(cmdOptions);
    startServer(options);
  });

program.parse(process.argv);
