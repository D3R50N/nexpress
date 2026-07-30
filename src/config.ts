import path from "path";
import fs from "fs";
import { createJiti } from "jiti";
import { logger } from "./logger";

const jitiLoader = createJiti(__filename, {
  cache: false,
  requireCache: false,
});

export function loadConfigFile(rootDir: string): Record<string, any> {
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
