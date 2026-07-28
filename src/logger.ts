import chalk from "chalk";
import { isDevMode, DevCheckOptions } from "./env";

const PREFIX = chalk.cyan.bold("[Nxpress]");

let lastLogKey = "";

function logDeduplicated(key: string, printNew: () => void) {
  if (key === lastLogKey) {
    return;
  }
  lastLogKey = key;
  printNew();
}

export const logger = {
  prefix: PREFIX,

  info(...args: any[]): void {
    const message = args.join(" ");
    const key = `info:${message}`;
    logDeduplicated(key, () => console.log(PREFIX, chalk.cyan(message)));
  },

  success(...args: any[]): void {
    const message = args.join(" ");
    const key = `success:${message}`;
    logDeduplicated(key, () => console.log(PREFIX, chalk.green(message)));
  },

  warn(...args: any[]): void {
    const message = args.join(" ");
    const key = `warn:${message}`;
    logDeduplicated(key, () => console.warn(PREFIX, chalk.yellow(message)));
  },

  error(...args: any[]): void {
    const message = args.join(" ");
    const key = `error:${message}`;
    logDeduplicated(key, () => console.error(PREFIX, chalk.red(message)));
  },

  log(...args: any[]): void {
    const message = args.join(" ");
    const key = `log:${message}`;
    logDeduplicated(key, () => console.log(PREFIX, ...args));
  },

  serverRunning(port: number, options?: DevCheckOptions): void {
    lastLogKey = "";
    if (!isDevMode(options)) {
      console.log(`${PREFIX} ${chalk.green("Server running")}`);
      return;
    }
    console.log(
      `${PREFIX} ${chalk.green("Server running at")} ${chalk.underline(`http://localhost:${port}`)}`,
    );
    console.log(
      `${PREFIX} ${chalk.dim("Press 'r' to restart server manually")}`,
    );
  },
};
