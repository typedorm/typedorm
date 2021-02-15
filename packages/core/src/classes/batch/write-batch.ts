import {
  EntityTarget,
  PrimaryKeyAttributes,
  UnsupportedBatchWriteItemError,
} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {Connection} from '../connection/connection';
import {isWriteTransactionItemList} from '../transaction/type-guards';
import {
  isLazyTransactionWriteItemListLoader,
  LazyTransactionWriteItemListLoader,
} from '../transformer/is-lazy-transaction-write-item-list-loader';
import {Batch} from './batch';
import {isBatchAddCreateItem, isBatchAddDeleteItem} from './type-guards';

export interface WriteBatchCreate<Entity> {
  create: {
    item: Entity;
  };
}

export interface WriteBatchDelete<Entity, PrimaryKey> {
  delete: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>;
  };
}

export type WiteBatchAddItem<Entity, PrimaryKey> =
  | WriteBatchCreate<Entity>
  | WriteBatchDelete<Entity, PrimaryKey>;

export class WriteBatch extends Batch {
  protected _items: {
    simpleRequestItems: DynamoDB.DocumentClient.WriteRequests;
    transactionListItems: DynamoDB.DocumentClient.TransactWriteItemList[];
    lazyTransactionListItems: LazyTransactionWriteItemListLoader[];
  };
  constructor(connection: Connection) {
    super(connection);
    this._items = {
      simpleRequestItems: [],
      lazyTransactionListItems: [],
      transactionListItems: [],
    };
  }

  add<Entity, PrimaryKey = Partial<Entity>>(
    batchItem: WiteBatchAddItem<Entity, PrimaryKey>
  ): this {
    if (isBatchAddCreateItem(batchItem)) {
      return this.addCreateItem(batchItem.create.item);
    } else if (isBatchAddDeleteItem(batchItem)) {
      return this.addDeleteItem(
        batchItem.delete.item,
        batchItem.delete.primaryKey
      );
    } else {
      throw new UnsupportedBatchWriteItemError(batchItem);
    }
  }

  addCreateItem<Entity>(item: Entity): this {
    const dynamoPutItemInput = this._dcRequestTransformer.toDynamoPutItem<
      Entity
    >(item);

    if (!isWriteTransactionItemList(dynamoPutItemInput)) {
      this.simpleRequestItems.push({
        PutRequest: {
          // drop all other options inherited from transformer, since batch operations has limited capability
          Item: dynamoPutItemInput.Item,
        },
      });
    } else {
      this.transactionListItems.push(dynamoPutItemInput);
    }
    return this;
  }

  addDeleteItem<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>
  ) {
    const itemToRemove = this._dcRequestTransformer.toDynamoDeleteItem<
      PrimaryKey,
      Entity
    >(item, primaryKey);

    if (!isLazyTransactionWriteItemListLoader(itemToRemove)) {
      this.simpleRequestItems.push({
        DeleteRequest: {
          // drop all extra props received from transformer
          Key: itemToRemove.Key,
        },
      });
    } else {
      this.lazyTransactionListItems.push(itemToRemove);
    }
    return this;
  }

  get items() {
    return this._items;
  }

  get simpleRequestItems() {
    return this._items.simpleRequestItems;
  }

  get lazyTransactionListItems() {
    return this._items.lazyTransactionListItems;
  }

  get transactionListItems() {
    return this._items.transactionListItems;
  }
}
