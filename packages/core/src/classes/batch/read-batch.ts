import {EntityTarget} from '@typedorm/common';
import {Batch} from './batch';

export interface ReadBatchItem<Entity, PrimaryKey> {
  item: EntityTarget<Entity>;
  primaryKey: PrimaryKey;
}

export class ReadBatch extends Batch<ReadBatchItem<any, any>> {
  add(batchItems: ReadBatchItem<any, any>[]): this {
    this.items.push(...batchItems);
    return this;
  }

  addGet<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKey
  ) {
    this._items.push({
      item,
      primaryKey,
    });

    return this;
  }
}
