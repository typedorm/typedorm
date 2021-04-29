import {EntityTarget, UpdateAttributes} from '@typedorm/common';
import {Connection} from '../connection/connection';
import {ConditionOptions} from '../expression/condition-options-type';
import {Transaction} from './transaction';

interface WriteTransactionCreateOptions<Entity> {
  /**
   * @default false
   */
  overwriteIfExists?: boolean;

  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}
export interface WriteTransactionCreate<Entity> {
  create: {item: Entity; options?: WriteTransactionCreateOptions<Entity>};
}

interface WriteTransactionUpdateOptions<Entity> {
  /**
   * @default '.'
   */
  nestedKeySeparator?: string;

  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}
export interface WriteTransactionUpdate<Entity, PrimaryKey> {
  update: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKey;
    body: UpdateAttributes<Entity, PrimaryKey>;
    options?: WriteTransactionUpdateOptions<Entity>;
  };
}

interface WriteTransactionDeleteOptions<Entity> {
  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}
export interface WriteTransactionDelete<Entity, PrimaryKey> {
  delete: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKey;
    options?: WriteTransactionDeleteOptions<Entity>;
  };
}
export type WriteTransactionItem<Entity, PrimaryKey> =
  | WriteTransactionCreate<Entity>
  | WriteTransactionUpdate<Entity, PrimaryKey>
  | WriteTransactionDelete<Entity, PrimaryKey>;

export class WriteTransaction extends Transaction<
  WriteTransactionItem<any, any>
> {
  constructor(
    /** only here for backwards compatibility
     * @deprecated
     * `WriteTransaction` does no longer need the connection object defined
     * at this level, it is now auto inferred by transaction transformer
     */
    connection?: Connection,
    /**
     * only here for backwards compatibility
     * @deprecated use `.add` for appending bulk items
     */
    transactionItems?: WriteTransactionItem<any, any>[]
  ) {
    super();

    if (transactionItems && transactionItems.length) {
      throw new Error(
        `From 1.12.x, appending existing operation to 'WriteTransaction' is not supported. 
        Please use '.add' for appending bulk items.`
      );
    }
  }

  /**
   * @deprecated use operation specific method or `.add` instead
   */
  chian<PrimaryKey, Entity>(
    chainedItem: WriteTransactionItem<PrimaryKey, Entity>
  ): this {
    return this.add([chainedItem as WriteTransactionItem<any, any>]);
  }

  add(transactionItems: WriteTransactionItem<any, any>[]): this {
    this.items.push(...transactionItems);
    return this;
  }

  addCreateItem<Entity>(
    item: Entity,
    options?: WriteTransactionCreateOptions<Entity>
  ): this {
    this.items.push({
      create: {
        item,
        options: options as WriteTransactionCreateOptions<any>,
      },
    });
    return this;
  }

  addUpdateItem<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKey,
    body: UpdateAttributes<Entity, PrimaryKey>,
    options?: WriteTransactionUpdateOptions<Entity>
  ): this {
    this.items.push({
      update: {
        item,
        primaryKey,
        body,
        options: options as WriteTransactionUpdateOptions<any>,
      },
    });
    return this;
  }

  addDeleteItem<Entity, PrimaryKey = Partial<Entity>>(
    item: EntityTarget<Entity>,
    primaryKey: PrimaryKey,
    options?: WriteTransactionDeleteOptions<Entity>
  ): this {
    this.items.push({
      delete: {
        item,
        primaryKey,
        options: options as WriteTransactionDeleteOptions<any>,
      },
    });
    return this;
  }
}
