import chalk from "chalk";

const PREFIX = chalk.cyan.bold("[Nxpress]");

let lastLogWasReload = false;

export const logger = {
  prefix: PREFIX,

  info(...args: any[]): void {
    lastLogWasReload = false;
    console.log(PREFIX, chalk.blue(...args));
  },

  success(...args: any[]): void {
    lastLogWasReload = false;
    console.log(PREFIX, chalk.green(...args));
  },

  warn(...args: any[]): void {
    lastLogWasReload = false;
    console.warn(PREFIX, chalk.yellow(...args));
  },

  error(...args: any[]): void {
    lastLogWasReload = false;
    console.error(PREFIX, chalk.red(...args));
  },

  log(...args: any[]): void {
    lastLogWasReload = false;
    console.log(PREFIX, ...args);
  },

  serverRunning(port: number): void {
    lastLogWasReload = false;
    if (process.env.NODE_ENV?.includes("prod") || false) {
      console.log(`${PREFIX} ${chalk.green("Server running")}`);
      return;
    }
    console.log(
      `${PREFIX} ${chalk.green("Server running at")} ${chalk.underline(`http://localhost:${port}`)}`,
    );
  },

  reload(filePath: string, reloadCount: number): void {
    if (lastLogWasReload) {
      process.stdout.write("\x1b[1A\x1b[2K"); // Move up one line and clear it
    }
    console.warn(
      PREFIX,
      chalk.yellow(`File changed (${filePath}). Reloading...`),
      reloadCount > 1 ? chalk.gray(`×${reloadCount}`) : "",
    );

    lastLogWasReload = true;
  },
};
