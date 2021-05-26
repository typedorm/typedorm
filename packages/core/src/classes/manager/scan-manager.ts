import {EntityTarget} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {Connection} from '../connection/connection';
import {MetadataOptions} from '../transformer/base-transformer';
import {DocumentClientRequestTransformer} from '../transformer/document-client-request-transformer';
import {DocumentClientTransactionTransformer} from '../transformer/document-client-transaction-transformer';
import {EntityTransformer} from '../transformer/entity-transformer';

interface ScanManageBaseOptions<Entity, PartitionKey> {
  /**
   * Table to run scan against
   * @default connection-table - table used at the time of connection creation will be used
   */
  tableName?: string;

  /**
   * Index to scan for items
   * @default - main table
   */
  scanIndex?: string;

  /**
   * Max number of records to query
   * @default - implicit dynamo db query limit is applied
   */
  limit?: number;

  /**
   * Cursor to traverse from
   */
  cursor?: DynamoDB.DocumentClient.Key;
}

export type ScanManagerScanOptions = ScanManageBaseOptions<any, any>;

export class ScanManager {
  private _dcReqTransformer: DocumentClientRequestTransformer;
  private _entityTransformer: EntityTransformer;

  constructor(private connection: Connection) {
    this._dcReqTransformer = new DocumentClientTransactionTransformer(
      connection
    );
    this._entityTransformer = new EntityTransformer(connection);
  }

  async find<Entity>(entityClass: EntityTarget<Entity>) {
    // TODO: implement higher level find operation
  }

  async scan(
    scanOptions?: ScanManagerScanOptions,
    metadataOptions?: MetadataOptions
  ) {
    // TODO: implement low level scan options
  }
}
