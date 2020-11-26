import { DynamoDB } from 'aws-sdk';
import { Connection } from '../connection/connection';
import {
  isCreateTransaction,
  isUpdateTransaction,
  Transaction,
  WriteTransactionChainItem,
} from './transaction';

export class WriteTransaction extends Transaction {
  protected _items: DynamoDB.DocumentClient.TransactWriteItemList;

  constructor(
    connection: Connection,
    initialItems?: DynamoDB.DocumentClient.TransactWriteItemList
  ) {
    super(connection);

    // initialize items if there are any
    if (initialItems) {
      this._items = [...initialItems];
    }
  }

  chian<PrimaryKey, Entity>(
    chainedItem: WriteTransactionChainItem<PrimaryKey, Entity>
  ): WriteTransaction {
    if (isCreateTransaction(chainedItem)) {
      const {
        create: { item },
      } = chainedItem;

      const dynamoPutItemInput = this._dcReqTransformer.toDynamoPutItem<Entity>(
        item
      );

      // when put item is set to array, one or more attributes are marked as unique
      // to maintain all records consistency, all items must be put into db as a single transaction
      if (!Array.isArray(dynamoPutItemInput)) {
        this._items.push({
          Put: dynamoPutItemInput,
        });
      } else {
        this._items.push(
          ...dynamoPutItemInput.map(puttItem => ({ Put: puttItem }))
        );
      }
    } else if (isUpdateTransaction(chainedItem)) {
      const { item, body, primaryKey, options } = chainedItem.update;
      this._items.push({
        Update: this._dcReqTransformer.toDynamoUpdateItem<PrimaryKey, Entity>(
          item,
          primaryKey,
          body,
          options
        ) as DynamoDB.Update,
      });
    }
    return this;
  }

  get items() {
    return this._items;
  }
}
