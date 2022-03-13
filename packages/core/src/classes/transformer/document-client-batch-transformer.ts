import {DocumentClientTypes} from '@typedorm/document-client';
import {
  BATCH_READ_ITEMS_LIMIT,
  BATCH_WRITE_ITEMS_LIMIT,
  InvalidBatchWriteItemError,
  TRANSFORM_BATCH_TYPE,
} from '@typedorm/common';
import {v4} from 'uuid';
import {getHashedIdForInput} from '../../helpers/get-hashed-id-for-input';
import {ReadBatch, ReadBatchItem} from '../batch/read-batch';
import {isBatchAddCreateItem, isBatchAddDeleteItem} from '../batch/type-guards';
import {WriteBatchItem, WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {isWriteTransactionItemList} from '../transaction/type-guards';
import {MetadataOptions} from './base-transformer';
import {
  isLazyTransactionWriteItemListLoader,
  LazyTransactionWriteItemListLoader,
} from './is-lazy-transaction-write-item-list-loader';
import {LowOrderTransformers} from './low-order-transformers';

export type WriteRequestWithMeta = {
  tableName: string;
  writeRequest: DocumentClientTypes.WriteRequest;
};

export type ReadRequestWithMeta = {
  tableName: string;
  readRequest: DocumentClientTypes.Key;
};

export type BatchWriteItemTransform<Transformed> = {
  rawInput: any;
  transformedInput: Transformed;
};

export type BatchWriteItemRequestMapTransform<Transformed> = {
  [key: string]: BatchWriteItemTransform<Transformed>[];
};

export class DocumentClientBatchTransformer extends LowOrderTransformers {
  constructor(connection: Connection) {
    super(connection);
  }

  toDynamoWriteBatchItems(
    writeBatch: WriteBatch,
    metadataOptions?: MetadataOptions
  ): {
    batchWriteRequestMapItems: DocumentClientTypes.BatchWriteItemRequestMapList;
    transactionListItems: BatchWriteItemTransform<
      DocumentClientTypes.TransactWriteItemList
    >[];
    lazyTransactionWriteItemListLoaderItems: BatchWriteItemTransform<
      LazyTransactionWriteItemListLoader
    >[];
    metadata: {
      namespaceId: string;
      itemTransformHashMap: Map<string, WriteBatchItem<any, any>>;
    };
  } {
    const {items} = writeBatch;
    this.connection.logger.logTransformBatch({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_BATCH_TYPE.BATCH_WRITE,
      prefix: 'Before',
      body: items,
    });

    const {
      lazyTransactionWriteItemListLoaderItems,
      simpleBatchRequestItems,
      transactionListItems,
      metadata,
    } = this.innerTransformBatchWriteItems(items, metadataOptions);

    // organize all requests in "tableName - requestItem" format
    const sorted = this.getWriteRequestsSortedByTable(simpleBatchRequestItems);

    // divide sorted requests in multiple batch items requests, as there are max
    // 25 items are allowed in a single batch operation
    const batchWriteRequestItems = this.mapTableWriteItemsToBatchWriteItems(
      sorted
    );

    const transformed = {
      batchWriteRequestMapItems: batchWriteRequestItems,
      transactionListItems,
      lazyTransactionWriteItemListLoaderItems,
      metadata,
    };

    this.connection.logger.logTransformBatch({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_BATCH_TYPE.BATCH_WRITE,
      prefix: 'After',
      body: transformed,
    });

    return transformed;
  }

  toDynamoReadBatchItems(
    readBatch: ReadBatch,
    metadataOptions?: MetadataOptions
  ): {
    batchRequestItemsList: DocumentClientTypes.BatchGetRequestMapList;
    metadata: {
      namespaceId: string;
      itemTransformHashMap: Map<string, ReadBatchItem<any, any>>;
    };
  } {
    const {items} = readBatch;

    this.connection.logger.logTransformBatch({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_BATCH_TYPE.BATCH_READ,
      prefix: 'Before',
      body: items,
    });

    const {metadata, batchReadRequestItems} = this.transformBatchReadItems(
      items
    );

    // organize all requests in "tableName - requestItem" format
    const sortedByTableName = this.getReadRequestsSortedByTable(
      batchReadRequestItems
    );

    // divide sorted requests in multiple batch items requests, as there are max
    // 100 items are allowed in a single batch read operation
    const batchRequestItemsList = this.mapTableReadItemsToBatchReadItems(
      sortedByTableName
    );

    const transformed = {
      batchRequestItemsList,
      metadata,
    };

    this.connection.logger.logTransformBatch({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_BATCH_TYPE.BATCH_READ,
      prefix: 'After',
      body: transformed,
    });
    return transformed;
  }

  mapTableWriteItemsToBatchWriteItems(
    requestsSortedByTable: DocumentClientTypes.BatchWriteItemRequestMap
  ) {
    let currentFillingIndex = 0;
    let totalItemsAtCurrentFillingIndex = 0;
    const multiBatchItems = Object.entries(requestsSortedByTable).reduce(
      (acc, [tableName, perTableItems]) => {
        // separate requests into multiple batch items, if there are more than allowed items to process in batch
        while (perTableItems.length) {
          if (!acc[currentFillingIndex]) {
            acc[currentFillingIndex] = {};
          }

          if (!acc[currentFillingIndex][tableName]) {
            acc[currentFillingIndex][tableName] = [];
          }

          acc[currentFillingIndex][tableName].push(perTableItems.shift()!);
          ++totalItemsAtCurrentFillingIndex;

          // batch write request has limit of 25 items per batch so once we hit that limit,
          // separate remaining items as new batch request
          if (totalItemsAtCurrentFillingIndex === BATCH_WRITE_ITEMS_LIMIT) {
            ++currentFillingIndex;
            totalItemsAtCurrentFillingIndex = 0;
          }
        }
        return acc;
      },
      [] as DocumentClientTypes.BatchWriteItemRequestMapList
    );
    return multiBatchItems;
  }

  mapTableReadItemsToBatchReadItems(
    requestsSortedByTable: DocumentClientTypes.BatchGetRequestMap
  ) {
    let currentFillingIndex = 0;
    let totalItemsAtCurrentFillingIndex = 0;
    const multiBatchItems = Object.entries(requestsSortedByTable).reduce(
      (acc, [tableName, perTableItems]) => {
        // separate requests into multiple batch items, if there are more than allowed items to process in batch
        while (perTableItems.Keys.length) {
          if (!acc[currentFillingIndex]) {
            acc[currentFillingIndex] = {};
          }

          if (!acc[currentFillingIndex][tableName]) {
            acc[currentFillingIndex][tableName] = {
              Keys: [],
            };
          }

          acc[currentFillingIndex][tableName].Keys?.push(
            perTableItems.Keys.shift()!
          );
          ++totalItemsAtCurrentFillingIndex;

          // batch read request has limit of max 100 items per batch so once we hit that limit,
          // separate remaining items as new batch request
          if (totalItemsAtCurrentFillingIndex === BATCH_READ_ITEMS_LIMIT) {
            ++currentFillingIndex;
            totalItemsAtCurrentFillingIndex = 0;
          }
        }
        return acc;
      },
      [] as DocumentClientTypes.BatchGetRequestMapList
    );
    return multiBatchItems;
  }

  /**
   * Reverse transforms batch write item request to write batch item
   */
  toWriteBatchInputList(
    requestMap: DocumentClientTypes.BatchWriteItemRequestMap,
    {
      namespaceId,
      itemTransformHashMap,
    }: {
      namespaceId: string;
      itemTransformHashMap: Map<string, WriteBatchItem<any, any>>;
    }
  ) {
    return Object.entries(requestMap).flatMap(([, writeRequests]) => {
      return this.toRawBatchInputItem<
        DocumentClientTypes.WriteRequest,
        WriteBatchItem<any, any>
      >(writeRequests, {
        namespaceId,
        itemTransformHashMap,
      });
    });
  }

  /**
   * Reverse transforms batch read item request to read batch item
   */
  toReadBatchInputList(
    requestMap: DocumentClientTypes.BatchGetRequestMap,
    {
      namespaceId,
      itemTransformHashMap,
    }: {
      namespaceId: string;
      itemTransformHashMap: Map<string, ReadBatchItem<any, any>>;
    }
  ) {
    return Object.entries(requestMap).flatMap(([, readRequests]) => {
      return this.toRawBatchInputItem<
        DocumentClientTypes.Key,
        ReadBatchItem<any, any>
      >(readRequests.Keys, {
        namespaceId,
        itemTransformHashMap,
      });
    });
  }

  /**
   * Converts batch item input to pre transformed item input
   */
  private toRawBatchInputItem<Input, Output>(
    transformedItems: Input[],
    {
      namespaceId,
      itemTransformHashMap,
    }: {
      namespaceId: string;
      itemTransformHashMap: Map<string, Output>;
    }
  ): Output[] {
    return transformedItems.map(transformedItem => {
      const hashId = getHashedIdForInput(namespaceId, transformedItem);
      const originalItem = itemTransformHashMap.get(hashId);
      return originalItem!;
    });
  }

  /**
   * Parse each item in the request to be in one of the following collections
   * - simpleBatchRequestItems: simple items that can be processed in batch (i.e no uniques)
   * - transactionListItems: items that must be processed in a transaction instead of batch (i.e items with unique attributes)
   * - LazyTransactionWriteItemListLoaderItems: items that are must be processed in transaction but also requires other requests to be made first (i.e delete of unique items)
   */
  private innerTransformBatchWriteItems(
    batchItems: WriteBatchItem<any, any>[],
    metadataOptions?: MetadataOptions
  ) {
    const namespaceId = v4();
    const itemTransformHashMap = new Map<string, WriteBatchItem<any, any>>();

    return batchItems.reduce(
      (acc, batchItem) => {
        // is create
        if (isBatchAddCreateItem(batchItem)) {
          // transform put item
          const dynamoPutItem = this.toDynamoPutItem(
            batchItem.create.item,
            undefined,
            metadataOptions
          );
          if (!isWriteTransactionItemList(dynamoPutItem)) {
            const transformedWriteRequest = {
              PutRequest: {
                Item: dynamoPutItem.Item,
              },
            };
            acc.simpleBatchRequestItems.push({
              writeRequest: transformedWriteRequest,
              tableName: dynamoPutItem.TableName as string,
            });
            // store transformed and original items as hash key/value

            const itemHashId = getHashedIdForInput(
              namespaceId,
              transformedWriteRequest
            );
            itemTransformHashMap.set(itemHashId, batchItem);
          } else {
            acc.transactionListItems.push({
              rawInput: batchItem,
              transformedInput: dynamoPutItem,
            });
          }
          // is delete
        } else if (isBatchAddDeleteItem(batchItem)) {
          const {
            delete: {item, primaryKey},
          } = batchItem;
          // transform delete item
          const itemToRemove = this.toDynamoDeleteItem(
            item,
            primaryKey,
            undefined,
            metadataOptions
          );
          if (!isLazyTransactionWriteItemListLoader(itemToRemove)) {
            const transformedItemRequest = {
              DeleteRequest: {
                Key: itemToRemove.Key,
              },
            };
            acc.simpleBatchRequestItems.push({
              writeRequest: transformedItemRequest,
              tableName: itemToRemove.TableName as string,
            });
            // store transformed and original items as hash key/value
            const itemHashId = getHashedIdForInput(
              namespaceId,
              transformedItemRequest
            );
            itemTransformHashMap.set(itemHashId, batchItem);
          } else {
            acc.lazyTransactionWriteItemListLoaderItems.push({
              rawInput: batchItem,
              transformedInput: itemToRemove,
            });
          }
        } else {
          throw new InvalidBatchWriteItemError(batchItem);
        }
        return acc;
      },
      {
        simpleBatchRequestItems: [] as WriteRequestWithMeta[],
        transactionListItems: [] as BatchWriteItemTransform<
          DocumentClientTypes.TransactWriteItemList
        >[],
        lazyTransactionWriteItemListLoaderItems: [] as BatchWriteItemTransform<
          LazyTransactionWriteItemListLoader
        >[],
        metadata: {
          namespaceId,
          itemTransformHashMap,
        },
      }
    );
  }

  private transformBatchReadItems(
    batchItems: ReadBatchItem<any, any>[],
    metadataOptions?: MetadataOptions
  ) {
    const namespaceId = v4();
    const itemTransformHashMap = new Map<string, ReadBatchItem<any, any>>();
    return batchItems.reduce(
      (acc, batchItem) => {
        const {item, primaryKey} = batchItem;

        // TODO: add read options support
        const itemToGet = this.toDynamoGetItem(
          item,
          primaryKey,
          undefined,
          metadataOptions
        );
        acc.batchReadRequestItems.push({
          readRequest: itemToGet.Key as DocumentClientTypes.Key,
          tableName: itemToGet.TableName as string,
        });

        // store batch item input and it's transform in map, for reverse transform later
        const transformedItemHashId = getHashedIdForInput(
          namespaceId,
          itemToGet.Key
        );
        itemTransformHashMap.set(transformedItemHashId, batchItem);
        return acc;
      },
      {
        batchReadRequestItems: [] as ReadRequestWithMeta[],
        metadata: {
          namespaceId,
          itemTransformHashMap,
        },
      }
    );
  }

  private getWriteRequestsSortedByTable(
    allRequestItems: WriteRequestWithMeta[]
  ) {
    return allRequestItems.reduce((acc: any, requestItemWithMeta) => {
      if (!acc[requestItemWithMeta.tableName]) {
        acc[requestItemWithMeta.tableName] = [];
      }

      acc[requestItemWithMeta.tableName].push(requestItemWithMeta.writeRequest);
      return acc;
    }, {});
  }

  private getReadRequestsSortedByTable(allRequestItems: ReadRequestWithMeta[]) {
    return allRequestItems.reduce((acc, requestItemWithMeta) => {
      if (!acc[requestItemWithMeta.tableName]) {
        acc[requestItemWithMeta.tableName] = {
          Keys: [],
        };
      }

      acc[requestItemWithMeta.tableName].Keys?.push(
        requestItemWithMeta.readRequest
      );
      return acc;
    }, {} as DocumentClientTypes.BatchGetRequestMap);
  }
}
