import {
  BATCH_WRITE_ITEMS_LIMIT,
  InvalidBatchWriteItemError,
  TRANSFORM_BATCH_TYPE,
} from '@typedorm/common';
import {DocumentClient, WriteRequests} from 'aws-sdk/clients/dynamodb';
import {createChunks} from '../../helpers/create-chunks';
import {isBatchAddCreateItem, isBatchAddDeleteItem} from '../batch/type-guards';
import {WiteBatchItem, WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {isWriteTransactionItemList} from '../transaction/type-guards';
import {
  isLazyTransactionWriteItemListLoader,
  LazyTransactionWriteItemListLoader,
} from './is-lazy-transaction-write-item-list-loader';
import {LowOrderTransformers} from './low-order-transformers';

export class DocumentClientBatchTransformer extends LowOrderTransformers {
  constructor(connection: Connection) {
    super(connection);
  }

  toDynamoWriteBatchItems(writeBatch: WriteBatch) {
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

    // if batch write requests contains more than one items, we spread them with multiple
    const chunkedBatchRequestItems = createChunks(
      simpleBatchRequestItems,
      BATCH_WRITE_ITEMS_LIMIT
    );

    const transformed = {
      batchWriteRequestListItems: chunkedBatchRequestItems,
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

  /**
   * Parse each item in the request to be in one of the following collections
   * - simpleBatchRequestItems: simple items that can be processed in batch (i.e no uniques)
   * - transactionListItems: items that must be processed in a transaction instead of batch (i.e items with unique attributes)
   * - LazyTransactionWriteItemListLoaderItems: items that are must be processed in transaction but also requires other requests to be made first (i.e delete of unique items)
   */
  private parseBatchWriteItem(batchItems: WiteBatchItem<any, any>[]) {
    return batchItems.reduce(
      (acc, batchItem) => {
        if (isBatchAddCreateItem(batchItem)) {
          // transform put item
          const dynamoPutItem = this.toDynamoPutItem(batchItem.create.item);
          if (!isWriteTransactionItemList(dynamoPutItem)) {
            acc.simpleBatchRequestItems.push({
              PutRequest: {
                // drop all other options inherited from transformer, since batch operations has limited capability
                Item: dynamoPutItem.Item,
              },
            });
          } else {
            acc.transactionListItems.push(dynamoPutItem);
          }
        } else if (isBatchAddDeleteItem(batchItem)) {
          const {
            delete: {item, primaryKey},
          } = batchItem;
          // transform delete item
          const itemToRemove = this.toDynamoDeleteItem(item, primaryKey);

          if (!isLazyTransactionWriteItemListLoader(itemToRemove)) {
            acc.simpleBatchRequestItems.push({
              DeleteRequest: {
                // drop all extra props received from transformer
                Key: itemToRemove.Key,
              },
            });
          } else {
            acc.lazyTransactionWriteItemListLoaderItems.push(itemToRemove);
          }
        } else {
          throw new InvalidBatchWriteItemError(batchItem);
        }
        return acc;
      },
      {
        simpleBatchRequestItems: [] as WriteRequests,
        transactionListItems: [] as DocumentClient.TransactWriteItemList[],
        lazyTransactionWriteItemListLoaderItems: [] as LazyTransactionWriteItemListLoader[],
      }
    );
  }
}
