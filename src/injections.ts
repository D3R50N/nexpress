import fs from "fs";
import path from "path";

/**
 * Reads an internal framework injection template file.
 * Strictly loads internal assets and prevents user project CWD overrides.
 */
export function getInjection(filename: string): string {
  const candidatePaths = [
    path.join(__dirname, "injections", filename),
    path.join(__dirname, "..", "src", "injections", filename),
    path.join(__dirname, "..", "dist", "injections", filename),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, "utf-8");
      } catch (err) {
        // continue
      }
    }
  }

  return "";
}
