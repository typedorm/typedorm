import {DynamoDB} from 'aws-sdk';
import {
  EntityTarget,
  PrimaryKeyAttributes,
  UpdateAttributes,
} from '@typedorm/common';
import {Connection} from '../connection/connection';
import {EntityManagerUpdateOptions} from '../manager/entity-manager';
import {DocumentClientRequestTransformer} from '../transformer/document-client-request-transformer';
import {LazyTransactionWriteItemListLoader} from '../transformer/is-lazy-transaction-write-item-list-loder';

// transaction interfaces
export interface WriteTransactionCreate<Entity> {
  create: {item: Entity};
}
export interface WriteTransactionUpdate<PrimaryKey, Entity> {
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

/**
 * Base Transaction
 */
export abstract class Transaction {
  protected _items: (
    | DynamoDB.DocumentClient.TransactWriteItem
    | LazyTransactionWriteItemListLoader
    | DynamoDB.DocumentClient.TransactGetItem
  )[];

  protected _dcReqTransformer: DocumentClientRequestTransformer;

  constructor(connection: Connection) {
    this._items = [];
    this._dcReqTransformer = new DocumentClientRequestTransformer(connection);
  }

  abstract chian<PrimaryKey, Entity>(
    item: WriteTransactionChainItem<PrimaryKey, Entity>
  ): Transaction;
}
