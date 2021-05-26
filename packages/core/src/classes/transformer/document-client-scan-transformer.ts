import {
  INTERNAL_ENTITY_ATTRIBUTE,
  InvalidFilterInputError,
  InvalidSelectInputError,
  NoSuchIndexFoundError,
  QUERY_SELECT_TYPE,
  Table,
} from '@typedorm/common';
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
  where?: any;
  select?: any[];
  onlyCount?: boolean;
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

    let transformedScanInput: DynamoDB.DocumentClient.ScanInput = {
      TableName: tableToScan.name,
      IndexName: verifiedIndexToScan,
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    };

    // transform additional options
    if (scanOptions && !isEmptyObject(scanOptions)) {
      const {cursor, limit, where, onlyCount, select} = scanOptions;

      transformedScanInput.Limit = limit;
      transformedScanInput.ExclusiveStartKey = cursor;

      // check if only the count was requested
      if (onlyCount) {
        if (select?.length) {
          throw new Error(
            'Attributes projection and count can not be used together'
          );
        }
        // count and projection selection can not be used together
        transformedScanInput.Select = QUERY_SELECT_TYPE.COUNT;
      }

      // build filter expression
      if (where && !isEmptyObject(where)) {
        const filter = this.expressionInputParser.parseToFilter(where);

        if (!filter) {
          throw new InvalidFilterInputError(where);
        }

        const {
          FilterExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
        } = this.expressionBuilder.buildFilterExpression(filter);

        transformedScanInput = {
          ...transformedScanInput,
          FilterExpression,
          ExpressionAttributeNames: {
            ...transformedScanInput.ExpressionAttributeNames,
            ...ExpressionAttributeNames,
          },
          ExpressionAttributeValues: {
            ...transformedScanInput.ExpressionAttributeValues,
            ...ExpressionAttributeValues,
          },
        };
      }

      // projection builder
      if (select?.length) {
        const projection = this.expressionInputParser.parseToProjection(select);

        if (!projection) {
          throw new InvalidSelectInputError(select);
        }

        const {
          ProjectionExpression,
          ExpressionAttributeNames,
        } = this.expressionBuilder.buildProjectionExpression(projection);

        transformedScanInput = {
          ...transformedScanInput,
          ProjectionExpression,
          ExpressionAttributeNames: {
            ...transformedScanInput.ExpressionAttributeNames,
            ...ExpressionAttributeNames,
          },
        };
      }
    }

    this.connection.logger.logTransformScan({
      requestId: metadataOptions?.requestId,
      prefix: 'After',
      body: transformedScanInput,
    });

    return transformedScanInput;
  }

  /**
   * Transforms DynamoDB scan output into entities
   */
  fromDynamoScanResponseItemList<T>(
    itemList: DynamoDB.DocumentClient.ItemList,
    metadataOptions?: MetadataOptions
  ): {
    items: T[];
    unknownItems: DynamoDB.DocumentClient.AttributeMap[];
  } {
    const initialResponse: {
      items: T[];
      unknownItems: DynamoDB.DocumentClient.AttributeMap[];
    } = {
      items: [],
      unknownItems: [],
    };

    if (!itemList.length) {
      return initialResponse;
    }

    return itemList.reduce((acc: typeof initialResponse, responseItem) => {
      const entityPhysicalName =
        responseItem[INTERNAL_ENTITY_ATTRIBUTE.ENTITY_NAME];

      // early return if no entity metadata was found on item
      if (!entityPhysicalName) {
        acc.unknownItems.push(responseItem);
        return acc;
      }

      const entityMetadata = this.connection.getEntityByPhysicalName(
        entityPhysicalName
      );

      const reverseTransformedItem = this.fromDynamoEntity(
        entityMetadata.target,
        responseItem,
        metadataOptions
      );

      acc.items.push(reverseTransformedItem);

      return acc;
    }, initialResponse);
  }
}
