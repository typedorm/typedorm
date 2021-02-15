import {
  EntityTarget,
  PrimaryKeyAttributes,
  UnsupportedBatchWriteItemError,
} from '@typedorm/common';
import {Connection} from '../connection/connection';
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
  constructor(connection: Connection) {
    super(connection);
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
    //TODO: batch create item
    return this;
  }

  addDeleteItem<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>
  ) {
    // TODO: batch add and delete
    return this;
  }
}
