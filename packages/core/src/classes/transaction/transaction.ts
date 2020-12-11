import {DynamoDB} from 'aws-sdk';
import {
  EntityTarget,
  PrimaryKeyAttributes,
  UpdateAttributes,
} from '@typedorm/common';
import {Connection} from '../connection/connection';
import {EntityManagerUpdateOptions} from '../manager/entity-manager';
import {DocumentClientRequestTransformer} from '../transformer/document-client-request-transformer';

// transaction interfaces
interface WriteTransactionCreate<Entity> {
  create: {item: Entity};
}
interface WriteTransactionUpdate<PrimaryKey, Entity> {
  update: {
    item: EntityTarget<Entity>;
    primaryKey: PrimaryKeyAttributes<PrimaryKey, any>;
    body: UpdateAttributes<PrimaryKey, Entity>;
    options?: EntityManagerUpdateOptions;
  };
}
export type WriteTransactionChainItem<PrimaryKey, Entity> =
  | WriteTransactionCreate<Entity>
  | WriteTransactionUpdate<PrimaryKey, Entity>;

// custom type guards
export function isCreateTransaction<Entity>(
  item: any
): item is WriteTransactionCreate<Entity> {
  return (item as WriteTransactionCreate<Entity>).create !== undefined;
}

export function isUpdateTransaction<PrimaryKey, Entity>(
  item: any
): item is WriteTransactionUpdate<PrimaryKey, Entity> {
  return (
    (item as WriteTransactionUpdate<PrimaryKey, Entity>).update !== undefined
  );
}

/**
 * Base Transaction
 */
export abstract class Transaction {
  protected _items:
    | DynamoDB.DocumentClient.TransactWriteItemList
    | DynamoDB.DocumentClient.TransactGetItemList;

  protected _dcReqTransformer: DocumentClientRequestTransformer;

  constructor(connection: Connection) {
    this._items = [];
    this._dcReqTransformer = new DocumentClientRequestTransformer(connection);
  }

  abstract chian<PrimaryKey, Entity>(
    item: WriteTransactionChainItem<PrimaryKey, Entity>
  ): Transaction;
}
