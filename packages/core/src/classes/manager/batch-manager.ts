import {DocumentClientTypes} from '@typedorm/document-client';
import {WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {DocumentClientBatchTransformer} from '../transformer/document-client-batch-transformer';
import pLimit from 'p-limit';
import {
  BATCH_READ_MAX_ALLOWED_ATTEMPTS,
  BATCH_WRITE_CONCURRENCY_LIMIT,
  BATCH_WRITE_MAX_ALLOWED_ATTEMPTS,
  INTERNAL_ENTITY_ATTRIBUTE,
  MANAGER_NAME,
  STATS_TYPE,
} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {ReadBatch} from '../batch/read-batch';
import {MetadataOptions} from '../transformer/base-transformer';
import {getUniqueRequestId} from '../../helpers/get-unique-request-id';

export enum REQUEST_TYPE {
  TRANSACT_WRITE = 'TRANSACT_WRITE',
  BATCH_WRITE = 'BATCH_WRITE',
  BATCH_READ = 'BATCH_READ',
}

/**
 * Batch manager write options
 */
export type BatchManagerWriteOptions = BatchManageBaseOptions;

/**
 * Batch manager read options
 */
export type BatchManagerReadOptions = BatchManageBaseOptions;

export interface BatchManageBaseOptions {
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
    this.resetErrorQueue();
  }

  /**
   * Writes all given items to dynamodb using either batch or transaction api.
   * _Note_: Transaction api is always used when item being written is using a unique attribute
   * @param batch
   */
  async write(
    batch: WriteBatch,
    options?: BatchManagerWriteOptions,
    metadataOptions?: MetadataOptions
  ) {
    this.resetErrorQueue();
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    if (options?.requestsConcurrencyLimit) {
      this.limit = pLimit(options?.requestsConcurrencyLimit);
    }

    this.connection.logger.logInfo({
      requestId,
      scope: MANAGER_NAME.BATCH_MANAGER,
      log: `Running a batch write request for ${batch.items.length} items`,
    });

    // 0. transform batch request
    const {
      batchWriteRequestMapItems,
      lazyTransactionWriteItemListLoaderItems,
      transactionListItems,
      metadata,
    } = this._dcBatchTransformer.toDynamoWriteBatchItems(batch, {
      requestId,
    });

    // 1.1. get transaction write items limits
    const transactionRequests = transactionListItems.map(
      ({rawInput, transformedInput}) => {
        // make all promises in pLimitable so their concurrency can be controlled properly
        return this.toLimited(
          () =>
            this.connection.transactionManger.writeRaw(transformedInput, {
              requestId,
              returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
            }),
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
              transformedInput.primaryKeyAttributes,
              undefined,
              {
                requestId,
                returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
              }
            );

            const deleteTransactionItemList = transformedInput.lazyLoadTransactionWriteItems(
              existingItem
            );

            return this.connection.transactionManger.writeRaw(
              deleteTransactionItemList,
              {
                requestId,
                returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
              }
            );
          },

          // default item to return if failed to process
          rawInput,
          REQUEST_TYPE.TRANSACT_WRITE
        );
      }
    );

    // 1.3. get all batch toLimited promises
    const batchRequests = batchWriteRequestMapItems.map(batchRequestMap => {
      return this.toLimited(
        async () =>
          this.connection.documentClient.batchWrite({
            RequestItems: {...batchRequestMap},
            ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
          }),
        // for batch requests this returning item will be transformed to
        // original input items later
        batchRequestMap,
        REQUEST_TYPE.BATCH_WRITE
      );
    });

    const allRequests = [
      ...transactionRequests,
      ...lazyTransactionRequests,
      ...batchRequests,
    ] as
      | Promise<DocumentClientTypes.TransactWriteItemOutput>[]
      | Promise<DocumentClientTypes.BatchWriteItemOutput>[];

    // 2. wait for all promises to finish
    const responses = await Promise.all(allRequests);

    // log stats
    responses.forEach((response, index) => {
      if (response.ConsumedCapacity) {
        this.connection.logger.logStats({
          scope: MANAGER_NAME.BATCH_MANAGER,
          requestId,
          requestSegment: index,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }
    });

    // 3. run retry attempts
    // process all unprocessed items recursively until all are either done
    // or reached the retry limit
    const unprocessedItems = await this.recursiveHandleBatchWriteItemsResponse(
      responses,
      0, // initially set the attempts counter to 0,
      options,
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    // 4.1. reverse parse all failed inputs to original user inputs
    // filter or drop any empty values
    const transformedUnprocessedItems = unprocessedItems.flatMap(
      (unprocessedItemInput: DocumentClientTypes.BatchWriteItemRequestMap) =>
        this._dcBatchTransformer.toWriteBatchInputList(
          unprocessedItemInput,
          metadata
        )
    );

    // 4.2. reverse parse all unprocessed inputs to original user inputs
    // parse failed items to original input
    const failedItemsOriginalInput = this._errorQueue.flatMap(item => {
      if (item.requestType === REQUEST_TYPE.BATCH_WRITE) {
        return this._dcBatchTransformer.toWriteBatchInputList(
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
      unprocessedItems: transformedUnprocessedItems,
      failedItems: failedItemsOriginalInput,
    };
  }

  /**
   * Reads all items given in batch with default eventually consistent read type
   * _Note_: Returned items are not guaranteed to be in the same sequence as requested
   */
  async read(
    batch: ReadBatch,
    options?: BatchManagerReadOptions,
    metadataOptions?: MetadataOptions
  ) {
    this.resetErrorQueue();
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    if (options?.requestsConcurrencyLimit) {
      this.limit = pLimit(options?.requestsConcurrencyLimit);
    }

    this.connection.logger.logInfo({
      requestId,
      scope: MANAGER_NAME.BATCH_MANAGER,
      log: `Running a batch read request for ${batch.items.length} items`,
    });

    // 0. transform batch request
    const {
      batchRequestItemsList,
      metadata,
    } = this._dcBatchTransformer.toDynamoReadBatchItems(batch, {
      requestId,
    });

    // 1. get items requests with concurrency applied
    const batchRequests = batchRequestItemsList.map(batchRequestItems => {
      return this.toLimited(
        async () =>
          this.connection.documentClient.batchGet({
            RequestItems: {...batchRequestItems},
            ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
          }),
        batchRequestItems,
        REQUEST_TYPE.BATCH_READ
      );
    });

    // 2. wait for all promises to finish, either failed or hit the limit
    const initialResponses = await Promise.all(batchRequests);

    // log stats
    initialResponses.forEach((response, index) => {
      if (response.ConsumedCapacity) {
        this.connection.logger.logStats({
          scope: MANAGER_NAME.BATCH_MANAGER,
          requestId,
          requestSegment: index,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }
    });

    // 3. run retries
    const {
      items,
      unprocessedItemsList,
    } = await this.recursiveHandleBatchReadItemsResponse(
      initialResponses,
      0,
      options,
      [],
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    // 4.1 transform responses to look like model
    const transformedItems = items.map(item => {
      const entityPhysicalName = item[INTERNAL_ENTITY_ATTRIBUTE.ENTITY_NAME];
      if (!entityPhysicalName) {
        this.connection.logger.logWarn({
          requestId,
          scope: MANAGER_NAME.ENTITY_MANAGER,
          log: `Item ${JSON.stringify(
            item
          )} is not known to TypeDORM there for transform was not run`,
        });
        return item;
      }

      const {target} = this.connection.getEntityByPhysicalName(
        entityPhysicalName
      );
      return this._dcBatchTransformer.fromDynamoEntity(target, item, {
        requestId,
      });
    }) as unknown[];

    // 4.2 transform unprocessed items
    const unprocessedTransformedItems = unprocessedItemsList?.flatMap(
      (item: DocumentClientTypes.BatchGetRequestMap) =>
        this._dcBatchTransformer.toReadBatchInputList(item, metadata)
    );

    // 4.3 transform failed items
    const failedTransformedItems = this._errorQueue.flatMap(item => {
      this.connection.logger.logError({
        requestId,
        scope: MANAGER_NAME.BATCH_MANAGER,
        log: item.error,
      });
      return this._dcBatchTransformer.toReadBatchInputList(
        item.requestInput,
        metadata
      );
    });

    // 5. return all items
    return {
      items: transformedItems ?? [],
      unprocessedItems: unprocessedTransformedItems ?? [],
      failedItems: failedTransformedItems ?? [],
    };
  }

  /**
   * Recursively parse batch requests until either all items are in or has reached retry limit
   * @param batchWriteItemOutputItems
   */
  private async recursiveHandleBatchWriteItemsResponse(
    batchWriteItemOutputItems: DocumentClientTypes.BatchWriteItemOutputList,
    totalAttemptsSoFar: number,
    options?: BatchManagerWriteOptions,
    metadataOptions?: MetadataOptions
  ): Promise<DocumentClientTypes.BatchWriteItemRequestMapList> {
    const unProcessedListItems = batchWriteItemOutputItems
      .filter(
        (response: DocumentClientTypes.BatchWriteItemOutput) =>
          response.UnprocessedItems && !isEmptyObject(response.UnprocessedItems)
      )
      .map(item => item.UnprocessedItems!);

    // if there are no unprocessed items, return
    if (!unProcessedListItems.length) {
      return unProcessedListItems;
    }

    // abort when reached max attempts count
    // if no retry attempts are given, use default attempts limit
    if (
      totalAttemptsSoFar ===
      (options?.maxRetryAttempts ?? BATCH_WRITE_MAX_ALLOWED_ATTEMPTS)
    ) {
      this.connection.logger.logInfo({
        scope: MANAGER_NAME.BATCH_MANAGER,
        log: `Reached max allowed attempts ${totalAttemptsSoFar}, aborting...`,
        requestId: metadataOptions?.requestId,
      });
      return unProcessedListItems;
    }

    // backoff for x ms before retrying for unprocessed items
    await this.waitForExponentialBackoff(
      totalAttemptsSoFar,
      undefined,
      metadataOptions
    );

    // organize unprocessed items into single "tableName-item" map
    const sortedUnprocessedItems = unProcessedListItems.reduce(
      (acc, unprocessedItems) => {
        Object.entries(unprocessedItems!).forEach(
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
      {} as DocumentClientTypes.BatchWriteItemRequestMap
    );

    const batchRequestsItems = this._dcBatchTransformer.mapTableWriteItemsToBatchWriteItems(
      sortedUnprocessedItems
    );

    // apply limit on all parallel requests
    const batchRequests = batchRequestsItems.map(batchRequestMap => {
      return this.toLimited(
        async () =>
          this.connection.documentClient.batchWrite({
            RequestItems: {...batchRequestMap},
            ReturnItemCollectionMetrics:
              metadataOptions?.returnConsumedCapacity,
          }),
        batchRequestMap,
        REQUEST_TYPE.BATCH_WRITE
      );
    });

    const batchRequestsResponses = (await Promise.all(
      batchRequests
    )) as DocumentClientTypes.BatchWriteItemOutputList;

    // log stats
    batchRequestsResponses.forEach((response, index) => {
      if (response.ConsumedCapacity) {
        this.connection.logger.logStats({
          requestId: metadataOptions?.requestId,
          scope: MANAGER_NAME.BATCH_MANAGER,
          requestSegment: index,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }
    });

    return this.recursiveHandleBatchWriteItemsResponse(
      batchRequestsResponses,
      ++totalAttemptsSoFar,
      options,
      metadataOptions
    );
  }

  private async recursiveHandleBatchReadItemsResponse(
    batchReadItemOutputList: DocumentClientTypes.BatchGetItemOutputList,
    totalAttemptsSoFar: number,
    options?: BatchManagerReadOptions,
    responsesStore: DocumentClientTypes.ItemList = [],
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: DocumentClientTypes.ItemList;
    unprocessedItemsList?: DocumentClientTypes.BatchGetRequestMapList;
  }> {
    // save all responses from api to responses store
    const batchReadResponses = batchReadItemOutputList
      .filter(
        (response: DocumentClientTypes.BatchGetItemOutput) =>
          response.Responses && !isEmptyObject(response.Responses)
      )
      .map(
        (response: DocumentClientTypes.BatchGetItemOutput) =>
          response.Responses!
      );
    if (batchReadResponses.length) {
      const mappedResponsesItemList = batchReadResponses.flatMap(
        batchGetResponse => this.mapBatchGetResponseToItemList(batchGetResponse)
      );
      responsesStore.push(...mappedResponsesItemList);
    }

    // recursively process all unprocessed items
    const unprocessedItemsList = batchReadItemOutputList.filter(
      (response: DocumentClientTypes.BatchGetItemOutput) =>
        response.UnprocessedKeys && !isEmptyObject(response.UnprocessedKeys)
    );

    // if all items were successfully processed, return
    if (!unprocessedItemsList.length) {
      return {
        items: responsesStore,
      };
    }

    // abort when reached max attempt count
    // if no retries provided use default BATCH_READ_MAX_ALLOWED_ATTEMPTS
    if (
      totalAttemptsSoFar ===
      (options?.maxRetryAttempts ?? BATCH_READ_MAX_ALLOWED_ATTEMPTS)
    ) {
      this.connection.logger.logInfo({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.BATCH_MANAGER,
        log: `Reached max allowed attempts ${totalAttemptsSoFar}, aborting...`,
      });

      return {
        items: responsesStore,
        unprocessedItemsList: unprocessedItemsList.map(
          item => item.UnprocessedKeys!
        ),
      };
    }

    // backoff before retrying
    await this.waitForExponentialBackoff(
      totalAttemptsSoFar,
      undefined,
      metadataOptions
    );

    // aggregate all requests by table name
    const sortedUnprocessedItems = unprocessedItemsList.reduce(
      (acc, {UnprocessedKeys}: DocumentClientTypes.BatchGetItemOutput) => {
        Object.entries(UnprocessedKeys!).forEach(
          ([tableName, unprocessedRequests]) => {
            if (!acc[tableName]) {
              acc[tableName] = {
                Keys: [],
              };
            }

            acc[tableName].Keys?.push(...unprocessedRequests.Keys);
          }
        );
        return acc;
      },
      {} as DocumentClientTypes.BatchGetRequestMap
    );

    const batchRequestsItemsList = this._dcBatchTransformer.mapTableReadItemsToBatchReadItems(
      sortedUnprocessedItems
    );

    // apply limit
    const batchRequests = batchRequestsItemsList.map(batchRequestMap => {
      return this.toLimited(
        async () =>
          this.connection.documentClient.batchGet({
            RequestItems: {...batchRequestMap},
            ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
          }),
        batchRequestMap,
        REQUEST_TYPE.BATCH_READ
      );
    });

    const batchRequestsResponses = (await Promise.all(
      batchRequests
    )) as DocumentClientTypes.BatchGetItemOutputList;

    // log stats
    batchRequestsResponses.forEach((response, index) => {
      if (response.ConsumedCapacity) {
        this.connection.logger.logStats({
          requestId: metadataOptions?.requestId,
          scope: MANAGER_NAME.BATCH_MANAGER,
          requestSegment: index,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }
    });

    return this.recursiveHandleBatchReadItemsResponse(
      batchRequestsResponses,
      ++totalAttemptsSoFar,
      options,
      // responses store containing responses from all requests
      responsesStore,
      metadataOptions
    );
  }

  private resetErrorQueue() {
    this._errorQueue = [];
  }

  private mapBatchGetResponseToItemList(
    batchGetResponse: DocumentClientTypes.BatchGetResponseMap
  ) {
    return Object.entries(batchGetResponse).flatMap(
      ([, batchResponse]) => batchResponse
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
          error: err as any,
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
    multiplicationFactor = 1,
    metadataOptions?: MetadataOptions
  ) {
    multiplicationFactor = multiplicationFactor < 1 ? 1 : multiplicationFactor;
    return new Promise(resolve => {
      const backoffTime = this.exponentialBackoff(
        attempts,
        multiplicationFactor
      );
      this.connection.logger.logInfo({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.BATCH_MANAGER,
        log: `${attempts} attempts so far, sleeping ${backoffTime}ms before retrying...`,
      });
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
