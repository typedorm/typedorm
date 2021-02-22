import {
  BATCH_WRITE_ITEMS_LIMIT,
  INTERNAL_ENTITY_ATTRIBUTE,
  InvalidBatchWriteItemError,
  TRANSFORM_BATCH_TYPE,
} from '@typedorm/common';
import {DocumentClient, WriteRequest} from 'aws-sdk/clients/dynamodb';
import {v4} from 'uuid';
import {getHashedIdForInput} from '../../helpers/get-hashed-id-for-input';
import {isBatchAddCreateItem, isBatchAddDeleteItem} from '../batch/type-guards';
import {WiteBatchItem, WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {isWriteTransactionItemList} from '../transaction/type-guards';
import {
  isLazyTransactionWriteItemListLoader,
  LazyTransactionWriteItemListLoader,
} from './is-lazy-transaction-write-item-list-loader';
import {LowOrderTransformers} from './low-order-transformers';

export type WriteRequestWithMeta = {
  tableName: string;
  writeRequest: WriteRequest;
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
    writeBatch: WriteBatch
  ): {
    batchWriteRequestMapItems: DocumentClient.BatchWriteItemRequestMap[];
    transactionListItems: BatchWriteItemTransform<
      DocumentClient.TransactWriteItemList
    >[];
    lazyTransactionWriteItemListLoaderItems: BatchWriteItemTransform<
      LazyTransactionWriteItemListLoader
    >[];
    metadata: {
      namespaceId: string;
      itemTransformHashMap: Map<string, WiteBatchItem<any, any>>;
    };
  } {
    const {items} = writeBatch;
    this.connection.logger.logTransformBatch(
      TRANSFORM_BATCH_TYPE.BATCH_WRITE,
      'Before',
      items
    );

    const {
      lazyTransactionWriteItemListLoaderItems,
      simpleBatchRequestItems,
      transactionListItems,
      metadata,
    } = this.parseBatchWriteItem(items);

    // organize all requests in "tableName - requestItem" format
    const sorted = this.getRequestsSortedByTable(simpleBatchRequestItems);

    // divide sorted requests in multiple batch items requests, as there are max
    // 25 items are allowed in a single batch operation
    const batchWriteRequestItems = this.mapTableItemsToBatchItems(sorted);

    const transformed = {
      batchWriteRequestMapItems: batchWriteRequestItems,
      transactionListItems,
      lazyTransactionWriteItemListLoaderItems,
      metadata,
    };

    this.connection.logger.logTransformBatch(
      TRANSFORM_BATCH_TYPE.BATCH_WRITE,
      'After',
      transformed
    );

    return transformed;
  }

  mapTableItemsToBatchItems(
    requestsSortedByTable: DocumentClient.BatchWriteItemRequestMap
  ) {
    let currentFillingIndex = 0;
    let totalItemsAtCurrentFillingIndex = 0;
    const multiBatchItems = Object.entries(requestsSortedByTable).reduce(
      (acc, [tableName, perTableWriteItems]) => {
        // separate requests into multiple batch items, if there are more than allowed items to process in batch
        while (perTableWriteItems.length) {
          if (!acc[currentFillingIndex]) {
            acc[currentFillingIndex] = {};
          }

          if (!acc[currentFillingIndex][tableName]) {
            acc[currentFillingIndex][tableName] = [];
          }

          acc[currentFillingIndex][tableName].push(perTableWriteItems.shift()!);
          ++totalItemsAtCurrentFillingIndex;

          // batch write request has limit of 25 items per batch, so once we hit that limit,
          // append remaining item as new batch request
          if (totalItemsAtCurrentFillingIndex === BATCH_WRITE_ITEMS_LIMIT) {
            ++currentFillingIndex;
            totalItemsAtCurrentFillingIndex = 0;
          }
        }
        return acc;
      },
      [] as DocumentClient.BatchWriteItemRequestMap[]
    );
    return multiBatchItems;
  }

  /**
   * Converts batch item input to pre transformed item input
   */
  toRawBatchInputItem(
    transformedItems: DocumentClient.WriteRequests,
    {
      namespaceId,
      itemTransformHashMap,
    }: {
      namespaceId: string;
      itemTransformHashMap: Map<string, WiteBatchItem<any, any>>;
    }
  ): WiteBatchItem<any, any>[] {
    return transformedItems.map(transformedItem => {
      const originalItem = itemTransformHashMap.get(
        getHashedIdForInput(namespaceId, transformedItem)
      );
      return originalItem!;
    });
  }

  /**
   * Parse each item in the request to be in one of the following collections
   * - simpleBatchRequestItems: simple items that can be processed in batch (i.e no uniques)
   * - transactionListItems: items that must be processed in a transaction instead of batch (i.e items with unique attributes)
   * - LazyTransactionWriteItemListLoaderItems: items that are must be processed in transaction but also requires other requests to be made first (i.e delete of unique items)
   */
  private parseBatchWriteItem(batchItems: WiteBatchItem<any, any>[]) {
    const namespaceId = v4();
    const itemTransformHashMap = new Map<string, WiteBatchItem<any, any>>();

    return batchItems.reduce(
      (acc, batchItem) => {
        // is create
        if (isBatchAddCreateItem(batchItem)) {
          // transform put item
          const dynamoPutItem = this.toDynamoPutItem(batchItem.create.item);
          if (!isWriteTransactionItemList(dynamoPutItem)) {
            const transformedWriteRequest = {
              PutRequest: {
                Item: dynamoPutItem.Item,
              },
            };
            acc.simpleBatchRequestItems.push({
              writeRequest: transformedWriteRequest,
              tableName: dynamoPutItem.TableName,
            });
            // store transformed and original items as hash key/value

            itemTransformHashMap.set(
              getHashedIdForInput(namespaceId, transformedWriteRequest),
              batchItem
            );
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
          const itemToRemove = this.toDynamoDeleteItem(item, primaryKey);
          if (!isLazyTransactionWriteItemListLoader(itemToRemove)) {
            const transformedItemRequest = {
              DeleteRequest: {
                Key: itemToRemove.Key,
              },
            };
            acc.simpleBatchRequestItems.push({
              writeRequest: transformedItemRequest,
              tableName: itemToRemove.TableName,
            });
            // store transformed and original items as hash key/value
            itemTransformHashMap.set(
              getHashedIdForInput(namespaceId, transformedItemRequest),
              batchItem
            );
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
          DocumentClient.TransactWriteItemList
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

  private getRequestsSortedByTable(allRequestItems: WriteRequestWithMeta[]) {
    return allRequestItems.reduce((acc, requestItemWithMeta) => {
      if (!acc[requestItemWithMeta.tableName]) {
        acc[requestItemWithMeta.tableName] = [];
      }

      acc[requestItemWithMeta.tableName].push(requestItemWithMeta.writeRequest);
      return acc;
    }, {} as DocumentClient.BatchWriteItemRequestMap);
  }
}
