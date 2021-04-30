import {EntityTarget} from '@typedorm/common';
import {ProjectionKeys} from '../expression/expression-input-parser';
import {Transaction} from './transaction';

interface ReadTransactionGetItemOptions<Entity> {
  /**
   * Specifies which attributes to fetch
   * @default all attributes are fetched
   */
  select?: ProjectionKeys<Entity>;
}

export interface ReadTransactionGet<
  Entity,
  PrimaryKeyAttributes = Partial<Entity>
> {
  get: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKeyAttributes;
    options?: ReadTransactionGetItemOptions<Entity>;
  };
}

export type ReadTransactionItem<Entity, PrimaryKey> = ReadTransactionGet<
  Entity,
  PrimaryKey
>;

export class ReadTransaction extends Transaction<
  ReadTransactionItem<any, any>
> {
  constructor() {
    super();
  }

  add(transactionItems: ReadTransactionItem<any, any>[]): this {
    this.items.push(...transactionItems);
    return this;
  }

  addGetItem<Entity, PrimaryKeyAttributes = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKeyAttributes,
    options?: ReadTransactionGetItemOptions<Entity>
  ) {
    this.items.push({
      get: {
        item,
        primaryKey,
        options,
      },
    });

    return this;
  }
}
