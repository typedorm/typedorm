import {
  EntityTarget,
  INTERNAL_ENTITY_ATTRIBUTE,
  MANAGER_NAME,
  STATS_TYPE,
} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {getUniqueRequestId} from '../../helpers/get-unique-request-id';
import {Connection} from '../connection/connection';
import {ProjectionKeys} from '../expression/expression-input-parser';
import {FilterOptions} from '../expression/filter-options-type';
import {MetadataOptions} from '../transformer/base-transformer';
import {DocumentClientScanTransformer} from '../transformer/document-client-scan-transformer';

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
   * @default none
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
   * @default all attributes are fetched
   */
  select?: ProjectionKeys<Entity>;
}

export type ScanManagerScanOptions = ScanManageBaseOptions<any, any> & {
  /**
   * Entity to scan
   * When one is provided, filter expression in auto updated to include filer condition for this entity
   * @default none
   */
  entity?: EntityTarget<any>;
};
export type ScanManagerFindOptions<Entity> = ScanManageBaseOptions<
  Entity,
  // empty object since all attributes including ones used in primary key can be used with filter
  {}
>;

export type ScanManagerCountOptions<Entity> = Pick<
  ScanManageBaseOptions<
    Entity,
    // empty object since all attributes including ones used in primary key can be used with filter
    {}
  >,
  'scanIndex' | 'where'
>;

export class ScanManager {
  private _dcScanTransformer: DocumentClientScanTransformer;

  constructor(private connection: Connection) {
    this._dcScanTransformer = new DocumentClientScanTransformer(connection);
  }

  /**
   * Finds all the matching entity over document client scan operation
   * @param entityClass Entity to find
   * @param findOptions find query options
   * @param metadataOptions Other metadata options
   */
  async find<Entity>(
    entityClass: EntityTarget<Entity>,
    findOptions?: ScanManagerFindOptions<Entity>,
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: Entity[] | undefined;
    cursor: DynamoDB.DocumentClient.Key | undefined;
  }> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const response = await this.scan<Entity>(
      {...findOptions, entity: entityClass} as ScanManagerScanOptions,
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    if (response.unknownItems?.length) {
      // log warning for items that were skipped form the response
      // These are items that had __en attribute on them but TypeDORM does no longer know about them
      this.connection.logger.logWarn({
        requestId,
        scope: MANAGER_NAME.SCAN_MANAGER,
        log: `"${response.unknownItems.length}" items were skipped from the response because TypDORM failed to resolve them.`,
      });
    }

    return {
      items: response.items,
      cursor: response.cursor,
    };
  }

  /**
   * Returns total count of all matching items for current entity
   * @param entityClass Entity to count
   * @param scanOptions Extra scan options
   * @param metadataOptions Other metadata options
   */
  async count<Entity>(
    entityClass: EntityTarget<Entity>,
    scanOptions?: ScanManagerCountOptions<Entity>,
    metadataOptions?: MetadataOptions
  ): Promise<number> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoScanInput = this._dcScanTransformer.toDynamoScanItem(
      {...scanOptions, entity: entityClass, onlyCount: true, select: undefined}, // select projection and count can not be used together
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    const count = await this._internalRecursiveCount({
      scanInput: dynamoScanInput,
      metadataOptions: {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      },
    });

    return count;
  }

  /**
   * Low level scan operation
   * Perhaps you are looking for higher level ScanManager.find operation
   * @param scanOptions scan options to run scan with
   * @param metadataOptions any other metadata options
   */
  async scan<Entity>(
    scanOptions?: ScanManagerScanOptions,
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: Entity[] | undefined;
    unknownItems: DynamoDB.DocumentClient.AttributeMap[] | undefined;
    cursor: DynamoDB.DocumentClient.Key | undefined;
  }> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoScanInput = this._dcScanTransformer.toDynamoScanItem(
      scanOptions,
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    const response = await this._internalRecursiveScan({
      scanInput: dynamoScanInput,
      limit: scanOptions?.limit,
      cursor: scanOptions?.cursor,
      metadataOptions: {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      },
    });

    const entities = this._dcScanTransformer.fromDynamoScanResponseItemList<
      Entity
    >(response.items);

    if (scanOptions?.entity && entities.unknownItems) {
      this.connection.logger.logWarn({
        requestId,
        scope: MANAGER_NAME.SCAN_MANAGER,
        log: `
        There were some items that looked like ${scanOptions?.entity.name} but TypeDORM was unable to convert it back to entity type,
        This can happen when there are items in the table with "${INTERNAL_ENTITY_ATTRIBUTE.ENTITY_NAME} but was not created by TypeDORM.
        You should remove them or update it to something different."`,
      });
    }

    return {
      items: entities.items?.length ? entities.items : undefined,
      unknownItems: entities.unknownItems?.length
        ? entities.unknownItems
        : undefined,
      cursor: response.cursor,
    };
  }

  /**
   * Recursively scans table with given options
   */
  private async _internalRecursiveScan({
    scanInput,
    limit,
    cursor,
    itemsFetched = [],
    metadataOptions,
  }: {
    scanInput: DynamoDB.DocumentClient.ScanInput;
    limit?: number;
    cursor?: DynamoDB.DocumentClient.Key;
    itemsFetched?: DynamoDB.DocumentClient.ItemList;
    metadataOptions?: MetadataOptions;
  }): Promise<{
    items: DynamoDB.DocumentClient.ItemList;
    cursor?: DynamoDB.DocumentClient.Key;
  }> {
    const {
      LastEvaluatedKey,
      Items = [],
      ConsumedCapacity,
    } = await this.connection.documentClient
      .scan({...scanInput, ExclusiveStartKey: cursor})
      .promise();

    // stats
    if (ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.SCAN_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: ConsumedCapacity,
      });
    }

    itemsFetched = [...itemsFetched, ...Items];

    if (LastEvaluatedKey) {
      if (!limit || itemsFetched.length < limit) {
        return this._internalRecursiveScan({
          scanInput,
          limit,
          cursor: LastEvaluatedKey,
          itemsFetched,
          metadataOptions,
        });
      }
    }

    return {
      items: itemsFetched,
      cursor: LastEvaluatedKey,
    };
  }

  /**
   * Recursively counts items form table with given options
   */
  private async _internalRecursiveCount({
    scanInput,
    cursor,
    currentCount = 0,
    metadataOptions,
  }: {
    scanInput: DynamoDB.DocumentClient.ScanInput;
    cursor?: DynamoDB.DocumentClient.Key;
    currentCount?: number;
    metadataOptions?: MetadataOptions;
  }): Promise<number> {
    const {
      Count,
      LastEvaluatedKey,
      ConsumedCapacity,
    } = await this.connection.documentClient
      .scan({...scanInput, ExclusiveStartKey: cursor})
      .promise();

    // stats
    if (ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.SCAN_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: ConsumedCapacity,
      });
    }

    currentCount += Count || 0;

    if (LastEvaluatedKey) {
      return this._internalRecursiveCount({
        scanInput,
        cursor: LastEvaluatedKey,
        currentCount,
        metadataOptions,
      });
    }

    return currentCount;
  }
}
