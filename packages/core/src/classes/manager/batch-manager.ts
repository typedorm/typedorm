import {WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {DocumentClientBatchTransformer} from '../transformer/document-client-batch-transformer';
import pLimit from 'p-limit';
import {
  BATCH_WRITE_CONCURRENCY_LIMIT,
  BATCH_WRITE_MAX_ALLOWED_ATTEMPTS,
  MANAGER_NAME,
} from '@typedorm/common';
import {WriteTransaction} from '../transaction/write-transaction';
import {
  BatchWriteItemRequestMap,
  DocumentClient,
} from 'aws-sdk/clients/dynamodb';
import {isEmptyObject} from '../../helpers/is-empty-object';

export enum REQUEST_TYPE {
  TRANSACT_WRITE = 'TRANSACT_WRITE',
  BATCH_WRITE = 'BATCH_WRITE',
}

/**
 * Batch manager write options
 */
export interface BatchManageWriteOptions {
  /**
   * Max number of retries to perform before returning to client
   * @default BATCH_WRITE_MAX_ALLOWED_ATTEMPTS
   */
  maxRetryAttempts?: number;

  /**
   * Max number of requests to run in parallel
   * @default BATCH_WRITE_CONCURRENCY_LIMIT
   */
  requestsConcurrencyLimit?: number;

  /**
   * Exponential backoff multiplication factor to apply on back off algorithm
   * @default 1
   */
  backoffMultiplicationFactor?: number;
}

export class BatchManager {
  private _dcBatchTransformer: DocumentClientBatchTransformer;
  private _errorQueue: {
    requestInput: any;
    error: Error;
    requestType: REQUEST_TYPE;
  }[];
  private limit = pLimit(BATCH_WRITE_CONCURRENCY_LIMIT);

  constructor(private connection: Connection) {
    this._dcBatchTransformer = new DocumentClientBatchTransformer(connection);
    this._errorQueue = [];
  }

  /**
   * Writes all given items to dynamodb using either batch or transaction api.
   * _Note_: Transaction api is always used when item being written is using a unique attribute
   * @param batch
   */
  async write(batch: WriteBatch, options?: BatchManageWriteOptions) {
    if (options?.requestsConcurrencyLimit) {
      this.limit = pLimit(options?.requestsConcurrencyLimit);
    }

    this.connection.logger.logInfo(
      MANAGER_NAME.BATCH_MANAGER,
      `Running a batch write request for ${batch.items.length} items`
    );

    const {
      batchWriteRequestMapItems,
      lazyTransactionWriteItemListLoaderItems,
      transactionListItems,
      metadata,
    } = this._dcBatchTransformer.toDynamoWriteBatchItems(batch);

    // 1.1. get transaction write items limits
    const transactionRequests = transactionListItems.map(
      ({rawInput, transformedInput}) => {
        const writeTransaction = new WriteTransaction(
          this.connection,
          transformedInput
        );

        // make all promises in pLimitable so their concurrency can be controlled properly
        return this.toLimited(
          () => this.connection.transactionManger.write(writeTransaction),
          // return original item when failed to process
          rawInput,
          REQUEST_TYPE.TRANSACT_WRITE
        );
      }
    );

    // 1.2. get all the lazy loaded promises
    // these are basically all the delete requests that uses unique keys
    const lazyTransactionRequests = lazyTransactionWriteItemListLoaderItems.map(
      ({rawInput, transformedInput}) => {
        return this.toLimited(
          async () => {
            const existingItem = await this.connection.entityManager.findOne(
              transformedInput.entityClass,
              transformedInput.primaryKeyAttributes
            );

            if (!existingItem) {
              throw new Error(
                `Failed to batch write item ${
                  transformedInput.entityClass.name
                }. Could not find entity with primary key "${JSON.stringify(
                  transformedInput.primaryKeyAttributes
                )}"`
              );
            }

            const deleteTransactionItemList = transformedInput.lazyLoadTransactionWriteItems(
              existingItem
            );

            const writeTransaction = new WriteTransaction(
              this.connection,
              deleteTransactionItemList
            );

            return this.connection.transactionManger.write(writeTransaction);
          },

          // default item to return if failed to process
          rawInput,
          REQUEST_TYPE.TRANSACT_WRITE
        );
      }
    );

    // 1.3. get all batch toLimited promises
    const batchRequests = batchWriteRequestMapItems.map(batchRequestMap => {
      const originalInputItems = this._dcBatchTransformer.toBatchInputList(
        batchRequestMap,
        metadata
      );
      return this.toLimited(
        async () =>
          this.connection.documentClient
            .batchWrite({
              RequestItems: {...batchRequestMap},
            })
            .promise(),
        originalInputItems,
        REQUEST_TYPE.BATCH_WRITE
      );
    });

    const allRequests = [
      ...transactionRequests,
      ...lazyTransactionRequests,
      ...batchRequests,
    ] as
      | Promise<DocumentClient.TransactWriteItemsOutput>[]
      | Promise<DocumentClient.BatchWriteItemOutput>[];

    // 2. wait for all promises to finish
    const responses = await Promise.all(allRequests);

    // 3. run retry attempts
    // filter all unprocessed Items
    const unProcessedListItems = responses.filter(
      (response: DocumentClient.BatchWriteItemOutput) =>
        response.UnprocessedItems && !isEmptyObject(response.UnprocessedItems)
    );
    // process all unprocessed items recursively until all are either done
    // or reached the retry limit
    const unprocessedItems = await this.recursiveHandleUnprocessedBatchItems(
      unProcessedListItems,
      0, // initially set the attempts counter to 0,
      options
    );

    // 4.1. reverse parse all failed inputs to original user inputs
    // filter or drop any empty values
    const unProcessedItemsOriginalInput = [
      ...unprocessedItems
        .map((item: any) => item?.UnprocessedItems)
        .filter(item => item && !isEmptyObject(item))
        .flatMap(
          (unprocessedItemInput: DocumentClient.BatchWriteItemRequestMap) =>
            this._dcBatchTransformer.toBatchInputList(
              unprocessedItemInput,
              metadata
            )
        ),
    ];

    // 4.2. reverse parse all unprocessed inputs to original user inputs
    // parse failed items to original input
    const failedItemsOriginalInput = this._errorQueue.flatMap(item => {
      if (item.requestType === REQUEST_TYPE.BATCH_WRITE) {
        return this._dcBatchTransformer.toBatchInputList(
          item.requestInput,
          metadata
        );
      } else if (item.requestType === REQUEST_TYPE.TRANSACT_WRITE) {
        return item.requestInput;
      } else {
        throw new Error(
          'Unsupported request type, if this continues please file an issue on github'
        );
      }
    });

    // 5. return unProcessable or failed items to user
    return {
      unprocessedItems: unProcessedItemsOriginalInput,
      failedItems: failedItemsOriginalInput,
    };
  }

  /**
   * Recursively parse batch requests until either all items are in or has reached retry limit
   * @param batchWriteItemOutputItems
   */
  private async recursiveHandleUnprocessedBatchItems(
    batchWriteItemOutputItems: DocumentClient.BatchWriteItemOutput[],
    totalAttemptsSoFar: number,
    options?: BatchManageWriteOptions
  ): Promise<DocumentClient.BatchWriteItemOutput[]> {
    const unProcessedListItems = batchWriteItemOutputItems.filter(
      (response: DocumentClient.BatchWriteItemOutput) =>
        response.UnprocessedItems && !isEmptyObject(response.UnprocessedItems)
    );

    // if there are no unprocessed items, return
    if (!unProcessedListItems.length) {
      return batchWriteItemOutputItems;
    }

    // abort when reached max attempts count
    // if no retry attempts are given, use default attempts limit
    if (
      totalAttemptsSoFar ===
      (options?.maxRetryAttempts ?? BATCH_WRITE_MAX_ALLOWED_ATTEMPTS)
    ) {
      this.connection.logger.logInfo(
        MANAGER_NAME.BATCH_MANAGER,
        `Reached max allowed attempts ${totalAttemptsSoFar}, aborting...`
      );
      return batchWriteItemOutputItems;
    }

    // backoff for x ms before retrying for unprocessed items
    await this.waitForExponentialBackoff(totalAttemptsSoFar);

    // organize unprocessed items into single "tableName-item" map
    const sortedUnprocessedItems = unProcessedListItems.reduce(
      (acc, {UnprocessedItems}: DocumentClient.BatchWriteItemOutput) => {
        Object.entries(UnprocessedItems!).forEach(
          ([tableName, unprocessedRequests]) => {
            if (!acc[tableName]) {
              acc[tableName] = [];
            }
            // merge all items by tableName
            acc[tableName] = [...acc[tableName], ...unprocessedRequests];
          }
        );
        return acc;
      },
      {} as BatchWriteItemRequestMap
    );

    const batchRequestsItems = this._dcBatchTransformer.mapTableItemsToBatchItems(
      sortedUnprocessedItems
    );

    // apply limit on all parallel requests
    const batchRequests = batchRequestsItems.map(batchRequestMap => {
      return this.toLimited(
        async () =>
          this.connection.documentClient
            .batchWrite({
              RequestItems: {...batchRequestMap},
            })
            .promise(),
        batchRequestMap,
        REQUEST_TYPE.BATCH_WRITE
      );
    });

    const batchRequestsResponses = (await Promise.all(
      batchRequests
    )) as DocumentClient.BatchWriteItemOutput[];
    return this.recursiveHandleUnprocessedBatchItems(
      batchRequestsResponses,
      ++totalAttemptsSoFar,
      options
    );
  }

  /**
   * Returns promise that is Promise.all safe and also can be managed by p-limit
   * @param anyPromiseFactory
   * @param requestItem // request item input
   * @param requestType // request type
   */
  private toLimited<T>(
    anyPromiseFactory: () => Promise<T>,
    requestItem: any,
    requestType: REQUEST_TYPE
  ) {
    return this.limit(async () => {
      try {
        const response = await anyPromiseFactory();
        return response;
      } catch (err) {
        this._errorQueue.push({
          requestInput: requestItem,
          error: err,
          requestType,
        });
        // when any error is thrown while promises are running, return it
        // instead of throwing it to have other requests run as is without
        // interruptions
        return err as T;
      }
    });
  }

  private waitForExponentialBackoff(
    attempts: number,
    multiplicationFactor = 1
  ) {
    multiplicationFactor = multiplicationFactor < 1 ? 1 : multiplicationFactor;
    return new Promise(resolve => {
      const backoffTime = this.exponentialBackoff(
        attempts,
        multiplicationFactor
      );
      this.connection.logger.logInfo(
        MANAGER_NAME.BATCH_MANAGER,
        `${attempts} attempts so far, sleeping ${backoffTime}ms before retrying...`
      );
      setTimeout(resolve, backoffTime);
    });
  }

  /**
   * @param attempts
   */
  private exponentialBackoff(attempts: number, multiplicationFactor: number) {
    return Math.floor(
      Math.random() * 10 * Math.pow(2, attempts || 1) * multiplicationFactor
    );
  }
}
