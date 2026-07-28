import chalk from "chalk";

const PREFIX = chalk.cyan.bold("[Nxpress]");

let lastLogKey = "";
let lastLogCount = 1;

function logDeduplicated(
  key: string,
  printNew: () => void,
  reprintWithCount: (count: number) => void,
) {
  if (key === lastLogKey) {
    lastLogCount++;
    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[1A\x1b[2K");
    }
    reprintWithCount(lastLogCount);
  } else {
    lastLogKey = key;
    lastLogCount = 1;
    printNew();
  }
}

export const logger = {
  prefix: PREFIX,

  info(...args: any[]): void {
    const message = args.join(" ");
    const key = `info:${message}`;
    logDeduplicated(
      key,
      () => console.log(PREFIX, chalk.blue(message)),
      (count) =>
        console.log(PREFIX, chalk.blue(message), chalk.gray(`×${count}`)),
    );
  },

  success(...args: any[]): void {
    const message = args.join(" ");
    const key = `success:${message}`;
    logDeduplicated(
      key,
      () => console.log(PREFIX, chalk.green(message)),
      (count) =>
        console.log(PREFIX, chalk.green(message), chalk.gray(`×${count}`)),
    );
  },

  warn(...args: any[]): void {
    const message = args.join(" ");
    const key = `warn:${message}`;
    logDeduplicated(
      key,
      () => console.warn(PREFIX, chalk.yellow(message)),
      (count) =>
        console.warn(PREFIX, chalk.yellow(message), chalk.gray(`×${count}`)),
    );
  },

  error(...args: any[]): void {
    const message = args.join(" ");
    const key = `error:${message}`;
    logDeduplicated(
      key,
      () => console.error(PREFIX, chalk.red(message)),
      (count) =>
        console.error(PREFIX, chalk.red(message), chalk.gray(`×${count}`)),
    );
  },

  log(...args: any[]): void {
    const message = args.join(" ");
    const key = `log:${message}`;
    logDeduplicated(
      key,
      () => console.log(PREFIX, ...args),
      (count) => console.log(PREFIX, ...args, chalk.gray(`×${count}`)),
    );
  },

  serverRunning(port: number): void {
    lastLogKey = "";
    lastLogCount = 1;
    if (process.env.NODE_ENV?.includes("prod") || false) {
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
