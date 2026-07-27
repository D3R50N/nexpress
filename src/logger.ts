import chalk from 'chalk';

const PREFIX = chalk.cyan.bold('[Nxpress]');

export const logger = {
  prefix: PREFIX,

  info(...args: any[]): void {
    console.log(PREFIX, chalk.blue(...args));
  },

  success(...args: any[]): void {
    console.log(PREFIX, chalk.green(...args));
  },

  warn(...args: any[]): void {
    console.warn(PREFIX, chalk.yellow(...args));
  },

  error(...args: any[]): void {
    console.error(PREFIX, chalk.red(...args));
  },

  log(...args: any[]): void {
    console.log(PREFIX, ...args);
  },

  serverRunning(port: number): void {
    console.log(
      `\n${PREFIX} ${chalk.green('TypeScript Server running at')} ${chalk.underline(`http://localhost:${port}`)}\n`
    );
  },
};
