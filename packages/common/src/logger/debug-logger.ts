import debug from 'debug';
import chalk from 'chalk';
import {v4} from 'uuid';

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

export enum STATS_TYPE {
  CONSUMED_CAPACITY = 'CONSUMED_CAPACITY',
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
  // stats logger
  private debugStatsLog = debug('typedorm:stats:log');

  /**
   * Get unique request id for each request, and include it in each log
   * this allows for easy debugging
   * @returns unique request uuid
   */
  getRequestId() {
    return v4();
  }

  logTransform({
    requestId,
    operation,
    prefix,
    entityName,
    primaryKey,
    body,
    options,
  }: {
    requestId?: string;
    operation: TRANSFORM_TYPE;
    prefix: string;
    entityName: string;
    primaryKey: any;
    body?: any;
    options?: any;
  }) {
    if (this.debugTransformLog.enabled) {
      this.debugTransformLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(
          operation
        )} ${chalk.blue(entityName)} ${chalk.magenta(prefix)}:`,
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

  logTransformBatch({
    requestId,
    operation,
    prefix,
    body,
    options,
  }: {
    requestId?: string;
    operation: TRANSFORM_BATCH_TYPE;
    prefix: string;
    body?: any;
    options?: any;
  }) {
    if (this.debugTransformBatchLog.enabled) {
      this.debugTransformBatchLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(
          operation
        )} ${chalk.magenta(prefix)}:`,
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

  logTransformTransaction({
    requestId,
    operation,
    prefix,
    body,
    options,
  }: {
    requestId?: string;
    operation: TRANSFORM_TRANSACTION_TYPE;
    prefix: string;
    body?: any;
    options?: any;
  }) {
    if (this.debugTransformTransactionLog.enabled) {
      this.debugTransformTransactionLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(
          operation
        )} ${chalk.magenta(prefix)}:`,
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

  logStats({
    requestId,
    statsType,
    consumedCapacityData,
  }: {
    requestId?: string;
    statsType: STATS_TYPE;
    consumedCapacityData: any;
  }) {
    if (this.debugStatsLog.enabled) {
      this.debugStatsLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(statsType)}:`,
        chalk.white(this.ensurePrintable(consumedCapacityData))
      );
    }
  }

  logInfo({
    requestId,
    scope,
    log,
  }: {
    requestId?: string;
    scope: MANAGER_NAME;
    log: string;
  }) {
    if (this.debugInfoLog.enabled) {
      this.debugInfoLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(scope)}:`,
        chalk.white(this.ensurePrintable(log))
      );
    }
  }

  logWarn({
    requestId,
    scope,
    log,
  }: {
    requestId?: string;
    scope: MANAGER_NAME;
    log: string;
  }) {
    if (this.debugWarnLog.enabled) {
      this.debugWarnLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(scope)}:`,
        chalk.yellow(this.ensurePrintable(log))
      );
    }
  }

  logError({
    requestId,
    scope,
    log,
  }: {
    requestId?: string;
    scope: MANAGER_NAME;
    log: any;
  }) {
    if (this.debugErrorLog.enabled) {
      this.debugErrorLog(
        `${chalk.bold.bgCyanBright(requestId)} ${chalk.green(scope)}:`,
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
