import {
  EntityTarget,
  PrimaryKeyAttributes,
  UpdateAttributes,
} from '@typedorm/common';
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
export interface WriteTransactionUpdate<PrimaryKey, Entity> {
  update: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>;
    body: UpdateAttributes<PrimaryKey, Entity>;
    options?: WriteTransactionUpdateOptions<Entity>;
  };
}

interface WriteTransactionDeleteOptions<Entity> {
  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}
export interface WriteTransactionDelete<PrimaryKey, Entity> {
  delete: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>;
    options?: WriteTransactionDeleteOptions<Entity>;
  };
}
export type WriteTransactionItem<PrimaryKey, Entity> =
  | WriteTransactionCreate<Entity>
  | WriteTransactionUpdate<PrimaryKey, Entity>
  | WriteTransactionDelete<PrimaryKey, Entity>;

export class WriteTransaction extends Transaction<
  WriteTransactionItem<any, any>
> {
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
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>,
    body: UpdateAttributes<PrimaryKey, Entity>,
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
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>,
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
