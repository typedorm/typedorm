import {
  BATCH_WRITE_ITEMS_LIMIT,
  INTERNAL_ENTITY_ATTRIBUTE,
  InvalidBatchWriteItemError,
  TRANSFORM_BATCH_TYPE,
} from '@typedorm/common';
import {DocumentClient, WriteRequest} from 'aws-sdk/clients/dynamodb';
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
    };

    this.connection.logger.logTransformBatch(
      TRANSFORM_BATCH_TYPE.BATCH_WRITE,
      'After',
      transformed
    );

    return transformed;
  }

  // TODO: add more test coverage tor batch items reverse transform
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

  toRawBatchInputItem(
    transformedItem: DocumentClient.WriteRequest
  ): WiteBatchItem<any, any> {
    if (transformedItem.PutRequest) {
      const dynamoItem = transformedItem.PutRequest.Item;
      const entityMetadata = this.connection.getEntityByPhysicalName(
        dynamoItem[INTERNAL_ENTITY_ATTRIBUTE.ENTITY_NAME]
      );
      const originalEntity = this.fromDynamoEntity(
        entityMetadata.target,
        dynamoItem
      );
      return {
        create: {
          item: originalEntity,
        },
      };
    } else if (transformedItem.DeleteRequest) {
      const dynamoKey = transformedItem.DeleteRequest.Key;
      const entityMetadata = this.connection.getEntityByPhysicalName(
        dynamoKey[INTERNAL_ENTITY_ATTRIBUTE.ENTITY_NAME]
      );
      return {
        delete: {
          item: entityMetadata.target,
          primaryKey: this.fromDynamoKeyToAttributes(
            entityMetadata.target,
            dynamoKey
          ),
        },
      };
    } else {
      throw new Error(
        `Invalid batch item type ${JSON.stringify(transformedItem)}`
      );
    }
  }

  /**
   * Parse each item in the request to be in one of the following collections
   * - simpleBatchRequestItems: simple items that can be processed in batch (i.e no uniques)
   * - transactionListItems: items that must be processed in a transaction instead of batch (i.e items with unique attributes)
   * - LazyTransactionWriteItemListLoaderItems: items that are must be processed in transaction but also requires other requests to be made first (i.e delete of unique items)
   */
  private parseBatchWriteItem(batchItems: WiteBatchItem<any, any>[]) {
    return batchItems.reduce(
      (acc, batchItem) => {
        // is create
        if (isBatchAddCreateItem(batchItem)) {
          // transform put item
          const dynamoPutItem = this.toDynamoPutItem(batchItem.create.item);
          if (!isWriteTransactionItemList(dynamoPutItem)) {
            acc.simpleBatchRequestItems.push({
              writeRequest: {
                PutRequest: {
                  Item: dynamoPutItem.Item,
                },
              },
              tableName: dynamoPutItem.TableName,
            });
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
            acc.simpleBatchRequestItems.push({
              writeRequest: {
                DeleteRequest: {
                  Key: itemToRemove.Key,
                },
              },
              tableName: itemToRemove.TableName,
            });
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
