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
