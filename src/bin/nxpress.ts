#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { serve, NxpressServerOptions } from "../server";
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
  .version(getNxpressVersion(), "-v, --version");

import { createJiti } from "jiti";

const jitiLoader = createJiti(__filename, {
  cache: false,
  requireCache: false,
});

function loadConfigFile(rootDir: string): Record<string, any> {
  const jsonConfig = path.join(rootDir, "nxpress.config.json");
  if (fs.existsSync(jsonConfig)) {
    try {
      delete require.cache[jsonConfig];
      return JSON.parse(fs.readFileSync(jsonConfig, "utf8"));
    } catch (e) {
      logger.warn("Failed to parse nxpress.config.json");
    }
  }

  const jsConfigCandidates = [
    path.join(rootDir, "nxpress.config.js"),
    path.join(rootDir, "nxpress.config.ts"),
    path.join(rootDir, "nxpress.config.mjs"),
    path.join(rootDir, "nxpress.config.cjs"),
  ];

  for (const jsConfig of jsConfigCandidates) {
    if (fs.existsSync(jsConfig)) {
      try {
        try {
          delete require.cache[require.resolve(jsConfig)];
        } catch (e) {}
        try {
          delete require.cache[jsConfig];
        } catch (e) {}
        try {
          delete require.cache[fs.realpathSync(jsConfig)];
        } catch (e) {}

        const loaded = jitiLoader(jsConfig);
        return loaded.default || loaded;
      } catch (e) {
        logger.warn(`Failed to load ${path.basename(jsConfig)}`);
      }
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
    options.isDev = true;
    serve(options);
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
    options.isDev = false;
    serve(options);
  });

program.parse(process.argv);
