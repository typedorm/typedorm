import {EntityTarget, PrimaryKeyAttributes} from '@typedorm/common';
import {Batch} from './batch';

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

export type WriteBatchItem<Entity, PrimaryKey> =
  | WriteBatchCreate<Entity>
  | WriteBatchDelete<Entity, PrimaryKey>;

export class WriteBatch extends Batch {
  protected _items: WriteBatchItem<any, any>[];
  constructor() {
    super();
    this._items = [];
  }

  add(batchItems: WriteBatchItem<any, any>[]): this {
    this.items.push(...batchItems);
    return this;
  }

  addCreateItem<Entity>(item: Entity): this {
    this.items.push({
      create: {
        item,
      },
    });
    return this;
  }

  addDeleteItem<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKey
  ) {
    this.items.push({
      delete: {
        item,
        primaryKey,
      },
    });
    return this;
  }

  get items() {
    return this._items;
  }
}
