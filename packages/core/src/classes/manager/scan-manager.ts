import {EntityTarget} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {Connection} from '../connection/connection';
import {ProjectionKeys} from '../expression/expression-input-parser';
import {FilterOptions} from '../expression/filter-options-type';
import {MetadataOptions} from '../transformer/base-transformer';
import {DocumentClientRequestTransformer} from '../transformer/document-client-request-transformer';
import {DocumentClientTransactionTransformer} from '../transformer/document-client-transaction-transformer';
import {EntityTransformer} from '../transformer/entity-transformer';

interface ScanManageBaseOptions<Entity, PartitionKey> {
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

  /**
   * Specify filter to apply
   * Avoid using this where possible, since filters in dynamodb applies after items
   * are read
   * @default none
   */
  where?: FilterOptions<Entity, PartitionKey>;

  /**
   * Specifies which attributes to fetch
   * @default all
   */
  select?: ProjectionKeys<Entity>;
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
