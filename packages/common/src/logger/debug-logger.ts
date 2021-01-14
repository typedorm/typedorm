import debug from 'debug';
import chalk from 'chalk';

export enum TRANSFORM_TYPE {
  GET = 'GET',
  PUT = 'PUT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
}

export class DebugLogger {
  // log
  private debugTransformLog = debug('typedorm:transform:log');
  constructor() {}

  logTransform(
    operation: TRANSFORM_TYPE,
    prefix: string,
    entityName: string,
    primaryKey: any,
    body?: any,
    options?: any
  ) {
    if (this.debugTransformLog.enabled) {
      this.debugTransformLog(
        `${chalk.green(operation)} ${chalk.blue(entityName)} ${chalk.magenta(
          prefix
        )}: `,
        ...(primaryKey
          ? [
              chalk.blueBright('\nPrimary key: '),
              chalk.white(this.ensurePrintable(primaryKey)),
            ]
          : []),
        ...(body
          ? [
              chalk.blueBright('\nBody: '),
              chalk.white(this.ensurePrintable(body)),
            ]
          : []),
        ...(options
          ? [
              chalk.blueBright('\nOptions: '),
              chalk.white(this.ensurePrintable(options)),
            ]
          : [])
      );
    }
  }

  private ensurePrintable(log: any) {
    if (typeof log === 'object' && log !== null) {
      return `\n${JSON.stringify(log, null, 2)}\n`;
    } else return log;
  }
}
