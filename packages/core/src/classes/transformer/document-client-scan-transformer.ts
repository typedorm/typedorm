import {IndexOptions, NoSuchIndexFoundError, Table} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {Connection} from '../connection/connection';
import {MetadataOptions} from './base-transformer';
import {LowOrderTransformers} from './low-order-transformers';

interface ScanTransformerToDynamoScanOptions {
  table?: Table;
  scanIndex?: string;
  limit?: number;
  cursor?: DynamoDB.DocumentClient.Key;
}

export class DocumentClientScanTransformer extends LowOrderTransformers {
  constructor(connection: Connection) {
    super(connection);
  }

  /**
   * Transforms TypeDORM input into dynamo scan operation input
   */
  toDynamoScanItem(
    scanOptions?: ScanTransformerToDynamoScanOptions,
    metadataOptions?: MetadataOptions
  ): DynamoDB.DocumentClient.ScanInput {
    const tableToScan = scanOptions?.table || this.connection.table;

    this.connection.logger.logTransformScan({
      requestId: metadataOptions?.requestId,
      prefix: 'Before',
      options: scanOptions ? {...scanOptions, table: tableToScan} : null,
    });

    let verifiedIndexToScan: string | undefined;

    // validate if index requested to scan belongs to current resolved table
    if (scanOptions?.scanIndex) {
      const scanIndexOptions = tableToScan.getIndexByKey(
        scanOptions?.scanIndex
      );
      if (!scanIndexOptions) {
        throw new NoSuchIndexFoundError(
          tableToScan.name,
          scanOptions?.scanIndex
        );
      }
    }

    const transformedScanInput: DynamoDB.DocumentClient.ScanInput = {
      TableName: tableToScan.name,
      IndexName: verifiedIndexToScan,
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    };

    if (scanOptions && !isEmptyObject(scanOptions)) {
      const {cursor, limit} = scanOptions;

      transformedScanInput.Limit = limit;
      transformedScanInput.ExclusiveStartKey = cursor;
      // TODO: add other filter and projection expressions support
    }

    this.connection.logger.logTransformScan({
      requestId: metadataOptions?.requestId,
      prefix: 'After',
      body: transformedScanInput,
    });

    return transformedScanInput;
  }
}
