import {WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {DocumentClientBatchTransformer} from '../transformer/document-client-batch-transformer';
import pLimit from 'p-limit';
import {
  BATCH_WRITE_CONCURRENCY_LIMIT,
  BATCH_WRITE_MAX_ALLOWED_ATTEMPTS,
} from '@typedorm/common';
import {WriteTransaction} from '../transaction/write-transaction';
import {
  BatchWriteItemRequestMap,
  DocumentClient,
} from 'aws-sdk/clients/dynamodb';
import {isEmptyObject} from '../../helpers/is-empty-object';

export class BatchManager {
  private _dcBatchTransformer: DocumentClientBatchTransformer;
  private _errorQueue: {requestInput: any; error: Error}[];
  private limit = pLimit(BATCH_WRITE_CONCURRENCY_LIMIT);

  constructor(private connection: Connection) {
    this._dcBatchTransformer = new DocumentClientBatchTransformer(connection);
    this._errorQueue = [];
  }

  async write(batch: WriteBatch) {
    // attempts counter
    let totalAttempts = 0;

    const {
      batchWriteRequestMapItems,
      lazyTransactionWriteItemListLoaderItems,
      transactionListItems,

      //TODO: use metadata to resolve processed items with actual input
      metadata,
    } = this._dcBatchTransformer.toDynamoWriteBatchItems(batch);

    // get transaction write items limits
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
          rawInput
        );
      }
    );

    // get all the lazy loaded promises
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
          rawInput
        );
      }
    );

    // get all batch toLimited promises
    const batchRequests = batchWriteRequestMapItems.map(batchRequestMap => {
      return this.toLimited(
        async () =>
          this.connection.documentClient
            .batchWrite({
              RequestItems: {...batchRequestMap},
            })
            .promise(),
        batchRequestMap
      );
    });

    const allRequests = [
      ...transactionRequests,
      ...lazyTransactionRequests,
      ...batchRequests,
    ] as
      | Promise<DocumentClient.TransactWriteItemsOutput>[]
      | Promise<DocumentClient.BatchWriteItemOutput>[];

    const responses = await Promise.all(allRequests);

    // filter all unprocessed Items
    const unProcessedListItems = responses.filter(
      (response: DocumentClient.BatchWriteItemOutput) =>
        response.UnprocessedItems && !isEmptyObject(response.UnprocessedItems)
    );

    // process all unprocessed items recursively until all are either done
    // or reached the retry limit
    const unprocessedItems = await this.recursiveHandleUnprocessedBatchItems(
      unProcessedListItems,
      ++totalAttempts
    );

    // filter or drop any empty values
    const allUnprocessedItems = [
      ...unprocessedItems
        .map((item: any) => item?.UnprocessedItems)
        .filter(item => item && !isEmptyObject(item)),
    ];

    return {
      unprocessedItems: allUnprocessedItems,
      failedItems: this._errorQueue.map(item => item.requestInput),
    };
  }

  private async recursiveHandleUnprocessedBatchItems(
    batchWriteItemOutputItems: DocumentClient.BatchWriteItemOutput[],
    totalAttemptsSoFar: number
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
    if (totalAttemptsSoFar === BATCH_WRITE_MAX_ALLOWED_ATTEMPTS) {
      console.log(
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
        batchRequestMap
      );
    });

    const batchRequestsResponses = (await Promise.all(
      batchRequests
    )) as DocumentClient.BatchWriteItemOutput[];
    return this.recursiveHandleUnprocessedBatchItems(
      batchRequestsResponses,
      ++totalAttemptsSoFar
    );
  }

  private toLimited<T>(anyPromiseFactory: () => Promise<T>, requestItem: any) {
    return this.limit(async () => {
      try {
        const response = await anyPromiseFactory();
        return response;
      } catch (err) {
        this._errorQueue.push({
          requestInput: requestItem,
          error: err,
        });
        // when any error is thrown while promises are running, return it
        // instead of throwing it to have other requests run as is without
        // interruptions
        return err as T;
      }
    });
  }

  private waitForExponentialBackoff(attempts: number) {
    return new Promise(resolve => {
      const backoffTime = this.exponentialBackoff(attempts);
      console.log(
        `${attempts} attempts so far, sleeping ${backoffTime}ms before retrying...`
      );
      setTimeout(resolve, backoffTime);
    });
  }

  /**
   * @param attempts
   */
  private exponentialBackoff(attempts: number) {
    return Math.floor(Math.random() * 10 * Math.pow(2, attempts));
  }
}
