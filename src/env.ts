export interface DevCheckOptions {
  isDev?: boolean;
}

/**
 * Determines whether Nxpress is running in development mode.
 * Returns false if explicitly set to false, or if NODE_ENV is "prod" / "production".
 */
export function isDevMode(options?: DevCheckOptions): boolean {
  if (options?.isDev === false) return false;
  if (options?.isDev === true) return true;

  const env = (process.env.NODE_ENV || "").trim().toLowerCase();
  if (env === "prod" || env === "production") {
    return false;
  }
  return true;
}

/**
 * Returns process.env filtered to only include NODE_ENV and variables starting with PUBLIC_ when secure is true.
 */
export function getFilteredEnv(
  secure: boolean = true,
): Record<string, string | undefined> {
  if (secure === false) {
    return process.env;
  }

  const filtered: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key === "NODE_ENV" || key.startsWith("PUBLIC_")) {
      filtered[key] = value;
    }
  }
  return filtered;
}
