import debug from 'debug';
import chalk from 'chalk';

export enum TRANSFORM_OPERATION {
  GET = 'GET',
  PUT = 'PUT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  QUERY = 'QUERY',
}

export class DebugLogger {
  // log
  private debugQueryLog = debug('typedorm:query:log');
  private debugTransformLog = debug('typedorm:transform:log');

  // error
  private debugQueryError = debug('typedorm:query:log');
  private debugTransformError = debug('typedorm:transform:error');

  logQuery(prefix: string, query: string) {
    if (this.debugQueryLog.enabled) {
      this.debugQueryLog(prefix, chalk.white(this.ensurePrintable(query)));
    }
  }

  errorQuery(error: any) {
    if (this.debugQueryError.enabled) {
      this.debugQueryError(chalk.red(this.ensurePrintable(error)));
    }
  }

  logTransform(
    operation: TRANSFORM_OPERATION,
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

  errorTransform(error: any) {
    if (this.debugTransformError.enabled) {
      this.debugTransformError(chalk.red(this.ensurePrintable(error)));
    }
  }

  private ensurePrintable(log: any) {
    if (typeof log === 'object' && log !== null) {
      return `\n${JSON.stringify(log, null, 2)}\n`;
    } else return log;
  }
}
