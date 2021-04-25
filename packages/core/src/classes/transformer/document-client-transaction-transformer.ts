import {
  LazyTransactionWriteItemListLoader,
  isLazyTransactionWriteItemListLoader,
} from './is-lazy-transaction-write-item-list-loader';
import DynamoDB, {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {
  isTransactionAddDeleteItem,
  isTransactionAddUpdateItem,
  isWriteTransactionItemList,
} from './../transaction/type-guards';
import {
  InvalidTransactionWriteItemError,
  TRANSFORM_TRANSACTION_TYPE,
} from '@typedorm/common';
import {
  WriteTransaction,
  WriteTransactionItem,
} from './../transaction/write-transaction';
import {Connection} from '../connection/connection';
import {LowOrderTransformers} from './low-order-transformers';
import {isTransactionAddCreateItem} from '../transaction/type-guards';
import {dropProp} from '../../helpers/drop-prop';

export class DocumentClientTransactionTransformer extends LowOrderTransformers {
  constructor(connection: Connection) {
    super(connection);
  }

  toDynamoWriteTransactionItems(writeTransaction: WriteTransaction) {
    const {items} = writeTransaction;

    this.connection.logger.logTransformTransaction(
      TRANSFORM_TRANSACTION_TYPE.TRANSACTION_WRITE,
      'Before',
      items
    );

    const transformed = this.innerTransformTransactionWriteItems(items);

    this.connection.logger.logTransformTransaction(
      TRANSFORM_TRANSACTION_TYPE.TRANSACTION_WRITE,
      'After',
      transformed
    );
    return transformed;
  }

  /**
   * Parse each item in the request to be in one of the following collections
   * - transactionListItems: items that must be processed in a transaction instead of batch (i.e items with unique attributes)
   * - lazyTransactionWriteItemListLoaderItems: items that are must be processed in transaction but also requires other requests to be made first (i.e delete of unique items)
   */
  private innerTransformTransactionWriteItems(
    transactionItems: WriteTransactionItem<any, any>[]
  ) {
    return transactionItems.reduce(
      (acc, transactionItem) => {
        if (isTransactionAddCreateItem(transactionItem)) {
          const {
            create: {item, options},
          } = transactionItem;

          const dynamoPutItemInput = this.toDynamoPutItem(item, options); // update

          if (!isWriteTransactionItemList(dynamoPutItemInput)) {
            acc.transactionItemList.push({
              Put: dynamoPutItemInput,
            });
          } else {
            acc.transactionItemList.push(...dynamoPutItemInput);
          }
        } else if (isTransactionAddUpdateItem(transactionItem)) {
          const {
            update: {item, primaryKey, body, options},
          } = transactionItem;

          const dynamoUpdateItemInput = this.toDynamoUpdateItem(
            item,
            primaryKey,
            body,
            options
          );
          if (!isLazyTransactionWriteItemListLoader(dynamoUpdateItemInput)) {
            acc.transactionItemList.push({
              Update: dropProp(
                dynamoUpdateItemInput,
                'ReturnValues'
              ) as DynamoDB.Update,
            });
          } else {
            acc.lazyTransactionWriteItemListLoader.push(dynamoUpdateItemInput);
          }
        } else if (isTransactionAddDeleteItem(transactionItem)) {
          const {
            delete: {item, primaryKey, options},
          } = transactionItem;

          const dynamoDeleteItemInput = this.toDynamoDeleteItem(
            item,
            primaryKey,
            options
          );
          if (!isLazyTransactionWriteItemListLoader(dynamoDeleteItemInput)) {
            acc.transactionItemList.push({
              Delete: dynamoDeleteItemInput,
            });
          } else {
            acc.lazyTransactionWriteItemListLoader.push(dynamoDeleteItemInput);
          }
        } else {
          throw new InvalidTransactionWriteItemError(transactionItem);
        }
        return acc;
      },
      {
        transactionItemList: [] as DocumentClient.TransactWriteItemList,
        lazyTransactionWriteItemListLoader: [] as LazyTransactionWriteItemListLoader[],
      }
    );
  }
}
