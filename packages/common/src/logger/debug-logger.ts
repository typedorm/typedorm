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

export enum MANAGER_NAME {
  ENTITY_MANAGER = 'ENTITY MANAGER',
  TRANSACTION_MANAGER = 'TRANSACTION MANAGER',
  BATCH_MANAGER = 'BATCH MANAGER',
}
export enum TRANSFORM_TRANSACTION_TYPE {
  TRANSACTION_WRITE = 'TRANSACTION_WRITE',
  TRANSACTION_READ = 'TRANSACTION_READ',
}

export enum TRANSFORM_BATCH_TYPE {
  BATCH_WRITE = 'BATCH_WRITE',
  BATCH_READ = 'BATCH_READ',
}

export class DebugLogger {
  // log
  private debugTransformLog = debug('typedorm:transform:log');
  // batch transform logger
  private debugTransformBatchLog = debug('typedorm:transform:batch:log');
  // transaction transform logger
  private debugTransformTransactionLog = debug(
    'typedorm:transform:transaction:log'
  );
  // info logger
  private debugInfoLog = debug('typedorm:info:log');
  private debugWarnLog = debug('typedorm:warn:log');
  private debugErrorLog = debug('typedorm:error:log');

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
        )}:`,
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

  logTransformBatch(
    operation: TRANSFORM_BATCH_TYPE,
    prefix: string,
    body?: any,
    options?: any
  ) {
    if (this.debugTransformBatchLog.enabled) {
      this.debugTransformBatchLog(
        `${chalk.green(operation)} ${chalk.magenta(prefix)}:`,
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

  logTransformTransaction(
    operation: TRANSFORM_TRANSACTION_TYPE,
    prefix: string,
    body?: any,
    options?: any
  ) {
    if (this.debugTransformTransactionLog.enabled) {
      this.debugTransformTransactionLog(
        `${chalk.green(operation)} ${chalk.magenta(prefix)}:`,
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

  logInfo(scope: MANAGER_NAME, log: string) {
    if (this.debugInfoLog.enabled) {
      this.debugInfoLog(
        `${chalk.green(scope)}:`,
        chalk.white(this.ensurePrintable(log))
      );
    }
  }

  logWarn(scope: MANAGER_NAME, log: string) {
    if (this.debugWarnLog.enabled) {
      this.debugWarnLog(
        `${chalk.green(scope)}:`,
        chalk.yellow(this.ensurePrintable(log))
      );
    }
  }

  logError(scope: MANAGER_NAME, log: any) {
    if (this.debugErrorLog.enabled) {
      this.debugErrorLog(
        `${chalk.green(scope)}:`,
        chalk.red(this.ensurePrintable(log))
      );
    }
  }

  private ensurePrintable(log: any) {
    if (typeof log === 'object' && log !== null) {
      return `\n${JSON.stringify(log, null, 2)}\n`;
    } else return log;
  }
}
