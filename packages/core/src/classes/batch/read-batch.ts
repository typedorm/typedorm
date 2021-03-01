import {EntityTarget} from '@typedorm/common';
import {Batch} from './batch';

export interface ReadBatchItemOptions {
  consistentRead?: boolean;
}

export interface ReadBatchItem<Entity, PrimaryKey> {
  item: EntityTarget<Entity>;
  primaryKey: PrimaryKey;
  options?: ReadBatchItemOptions;
}

export class ReadBatch extends Batch {
  protected _items: ReadBatchItem<any, any>[];
  constructor() {
    super();
    this._items = [];
  }

  add(batchItems: ReadBatchItem<any, any>[]): this {
    this.items.push(...batchItems);
    return this;
  }

  addGet<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKey,
    options?: ReadBatchItemOptions
  ) {
    this._items.push({
      item,
      primaryKey,
      options,
    });

    return this;
  }

  get items() {
    return this._items;
  }
}
