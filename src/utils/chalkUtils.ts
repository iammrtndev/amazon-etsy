import chalk from 'chalk';

export function error(str: string) {
  return chalk.bgRed.bold(str);
}

export function success(str: string) {
  return chalk.bgGreen.bold(str);
}

export function info(str: string) {
  return chalk.bgBlue.bold(str);
}

export function warning(str: string) {
  return chalk.bgYellow.bold(str);
}

export function dir(str: string) {
  return `"${chalk.underline(str)}"`;
}
