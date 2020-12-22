import {DynamoDB} from 'aws-sdk';

import {Connection} from '../connection/connection';
import {
  Transaction,
  WriteTransactionChainItem,
  WriteTransactionCreate,
} from './transaction';
import {
  isCreateTransaction,
  isUpdateTransaction,
  isWriteTransactionItemList,
} from './type-guards';

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
      this.items = this.chainCreateTransaction(chainedItem);
    } else if (isUpdateTransaction(chainedItem)) {
      //TODO: add support for update item in list
      const {item, body, primaryKey, options} = chainedItem.update;
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

  private chainCreateTransaction<Entity>(
    chainedItem: WriteTransactionCreate<Entity>
  ) {
    const {
      create: {item},
    } = chainedItem;

    const dynamoPutItemInput = this._dcReqTransformer.toDynamoPutItem<Entity>(
      item
    );

    if (!isWriteTransactionItemList(dynamoPutItemInput)) {
      return [
        {
          Put: dynamoPutItemInput,
        },
      ] as DynamoDB.DocumentClient.TransactWriteItemList;
    }

    return [...dynamoPutItemInput];
  }

  get items() {
    return this._items;
  }

  set items(items: DynamoDB.DocumentClient.TransactWriteItemList) {
    this._items = [...this.items, ...items];
  }
}
