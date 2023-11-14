import {DocumentClientTypes} from '@typedorm/document-client';
import {
  EntityTarget,
  INTERNAL_ENTITY_ATTRIBUTE,
  InvalidParallelScanLimitOptionError,
  MANAGER_NAME,
  PARALLEL_SCAN_CONCURRENCY_LIMIT,
  STATS_TYPE,
} from '@typedorm/common';
import pLimit from 'p-limit';
import {getUniqueRequestId} from '../../helpers/get-unique-request-id';
import {Connection} from '../connection/connection';
import {FilterOptions} from '../expression/filter-options-type';
import {ProjectionKeys} from '../expression/projection-keys-options-type';
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
  cursor?: DocumentClientTypes.Key;

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

export interface ScanManagerFindOptions<Entity>
  extends ScanManageBaseOptions<
    Entity,
    {} // empty object since all attributes including ones used in primary key can be used with filter
  > {
  /**
   * Total number of segments to divide this scan in.
   *
   * @default none - all items are scanned sequentially
   */
  totalSegments?: number;

  /**
   * Limit to apply per segment.
   *
   * when no `totalSegments` is provided, this option is ignored
   * @default none - limit to apply per segment
   */
  limitPerSegment?: number;

  /**
   * Item cursor, used for paginating a scan.
   *
   * When the `totalSegments` option is provided, this option should be of type {[segmentNo]: [Key]}
   * @default none
   */
  cursor?:
    | Record<number, ScanManageBaseOptions<Entity, {}>['cursor']>
    | ScanManageBaseOptions<Entity, {}>['cursor'];

  /**
   * Max number of requests to run in parallel
   *
   * When requesting parallel scan on x segments, request are executed in parallel using Promise.all
   * While it is okay to run small number of requests in parallel, it is often a good idea to enforce a concurrency controller to stop node from eating up the all the memory
   *
   * This parameter does exactly that. i.e if requested to run scan with `20,000` segments, and `requestsConcurrencyLimit` is set to `100`
   * TypeDORM will make sure that there are always only `100` requests are running in parallel at any time until all `20,000` segments have finished processing.
   *
   * @default PARALLEL_SCAN_CONCURRENCY_LIMIT
   */
  requestsConcurrencyLimit?: number;
}

export type ScanManagerCountOptions<Entity> = Pick<
  ScanManageBaseOptions<
    Entity,
    {} // empty object since all attributes including ones used in primary key can be used with filter
  >,
  'scanIndex' | 'where'
>;

export interface ScanManagerParallelScanOptions
  extends ScanManageBaseOptions<any, any> {
  /**
   * Total number of segments to divide this scan in
   */
  totalSegments: number;

  /**
   * Limit to apply per segment
   *
   * @default none - limit to apply per segment
   */
  limitPerSegment?: number;

  /**
   * Entity to run scan for.
   *
   * When one is provided, filter expression in auto updated to include a default filer condition for matching entity
   *
   * @default none
   */
  entity?: EntityTarget<any>;

  /**
   * Per segment cursor, where key is the segment number, and value is the cursor options for that segment
   *
   * @default none
   */
  cursor?: Record<number, ScanManagerScanOptions['cursor']>;

  /**
   * Max number of requests to run in parallel
   *
   * When requesting parallel scan on x segments, request are executed in parallel using Promise.all
   * While it is okay to run small number of requests in parallel, it is often a good idea to enforce a concurrency controller to stop node from eating up the all the memory
   *
   * This parameter does exactly that. i.e if requested to run scan with `20,000` segments, and `requestsConcurrencyLimit` is set to `100`
   * TypeDORM will make sure that there are always only `100` requests are running in parallel at any time until all `20,000` segments have finished processing.
   *
   * @default PARALLEL_SCAN_CONCURRENCY_LIMIT
   */
  requestsConcurrencyLimit?: number;
}

export interface ScanManagerScanOptions
  extends ScanManageBaseOptions<any, any> {
  /**
   * Entity to scan
   *
   * When one is provided, filter expression in auto updated to include filer condition for this entity
   *
   * @default none
   */
  entity?: EntityTarget<any>;

  /**
   * Number of current segment
   *
   * @default none - scan is not segmented
   */
  segment?: number;

  /**
   * Total number of segments to divide this scan in
   *
   * @default none - all items are scanned sequentially
   */
  totalSegments?: number;

  /**
   * Limit to apply per segment
   *
   * @default none - limit to apply per segment
   */
  limitPerSegment?: number;
}

export class ScanManager {
  private itemsFetchedSoFarTotalParallelCount: number;
  private limit = pLimit(PARALLEL_SCAN_CONCURRENCY_LIMIT);
  private _dcScanTransformer: DocumentClientScanTransformer;

  constructor(private connection: Connection) {
    this._dcScanTransformer = new DocumentClientScanTransformer(connection);
    this.itemsFetchedSoFarTotalParallelCount = 0;
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
  ) {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    let response: {
      items?: Entity[];
      unknownItems?: DocumentClientTypes.AttributeMap[];
      cursor?:
        | DocumentClientTypes.Key
        | Record<number, DocumentClientTypes.Key>;
    };

    if (findOptions?.totalSegments) {
      (response = await this.parallelScan<Entity>({
        ...findOptions,
        entity: entityClass,
      } as ScanManagerParallelScanOptions)),
        {
          requestId,
          returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
        };
    } else {
      response = await this.scan<Entity>(
        {...findOptions, entity: entityClass} as ScanManagerScanOptions,
        {
          requestId,
          returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
        }
      );
    }

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
   * Scans all items from dynamo table in parallel while also respecting the max provisioned concurrency
   * @param scanOptions Options for parallel scan
   * @param metadataOptions Additional metadata options
   */
  async parallelScan<Entity>(
    scanOptions: ScanManagerParallelScanOptions,
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: Entity[] | undefined;
    unknownItems: DocumentClientTypes.AttributeMap[] | undefined;
    cursor: Record<number, DocumentClientTypes.Key | undefined>;
  }> {
    // start with 0
    this.itemsFetchedSoFarTotalParallelCount = 0;

    const concurrencyLimit =
      PARALLEL_SCAN_CONCURRENCY_LIMIT || scanOptions.requestsConcurrencyLimit;
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    if (scanOptions.requestsConcurrencyLimit) {
      this.limit = pLimit(scanOptions.requestsConcurrencyLimit);
    }

    const parallelScanOptions: ScanManagerScanOptions[] = [];

    if (
      scanOptions?.limit &&
      scanOptions?.limitPerSegment &&
      scanOptions?.limit < scanOptions?.limitPerSegment
    ) {
      throw new InvalidParallelScanLimitOptionError(
        scanOptions?.limit,
        scanOptions?.limitPerSegment
      );
    }

    for (let index = 0; index < scanOptions.totalSegments; index++) {
      // only the cursor for same segment can be applied
      const cursorForSegment = scanOptions.cursor
        ? scanOptions.cursor[index]
        : undefined;

      parallelScanOptions.push({
        ...scanOptions,
        cursor: cursorForSegment,
        segment: index,
      });
    }

    this.connection.logger.logInfo({
      requestId,
      scope: MANAGER_NAME.SCAN_MANAGER,
      log: `Running scan in parallel with ${scanOptions.totalSegments} segments.`,
    });

    if (concurrencyLimit < scanOptions.totalSegments) {
      this.connection.logger.logInfo({
        requestId,
        scope: MANAGER_NAME.SCAN_MANAGER,
        log: `Current request concurrency limit ${concurrencyLimit} is lower than requested segments count ${scanOptions.totalSegments}
        So requests will be run in a batch of ${concurrencyLimit} at a time until all segments ${scanOptions.totalSegments} have processed.`,
      });
    }

    const allPromisesResponse = await Promise.all(
      parallelScanOptions.map(options =>
        this.toLimited(this._scan<Entity>(options, metadataOptions))
      )
    );

    // merge all responses
    const response = allPromisesResponse.reduce(
      (
        acc: {
          items: Entity[];
          unknownItems: DocumentClientTypes.AttributeMap[];
          cursor: Record<number, DocumentClientTypes.Key>;
        },
        current,
        index
      ) => {
        if (current.items?.length) {
          if (!acc.items) {
            acc.items = [];
          }
          acc.items = [...acc.items, ...current.items];
        }

        if (current.unknownItems?.length) {
          if (!acc.unknownItems) {
            acc.unknownItems = [];
          }
          acc.unknownItems = [...acc.unknownItems, ...current.unknownItems];
        }

        if (current.cursor) {
          if (!acc.cursor) {
            acc.cursor = {};
          }
          acc.cursor = {
            ...acc.cursor,
            [index]: current.cursor,
          };
        }
        return acc;
      },
      {} as {
        items: Entity[];
        unknownItems: DocumentClientTypes.AttributeMap[];
        cursor: Record<number, DocumentClientTypes.Key>;
      }
    );

    return response;
  }

  /**
   * Low level scan operation.
   *
   * Perhaps you are looking for higher level ScanManager.find or ScanManager.parallelScan operation
   * @param scanOptions scan options to run scan with
   * @param metadataOptions any other metadata options
   */
  async scan<Entity>(
    scanOptions?: ScanManagerScanOptions,
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: Entity[] | undefined;
    unknownItems: DocumentClientTypes.AttributeMap[] | undefined;
    cursor: DocumentClientTypes.Key | undefined;
  }> {
    // start with 0
    this.itemsFetchedSoFarTotalParallelCount = 0;
    return this._scan(scanOptions, metadataOptions);
  }

  /**
   * Internal implementation of scan.
   * In all external use-cases scan should be used
   * This implementation does not reset `itemsFetchedSoFarTotalParallelCount` as it is called from parallelScan
   * @param {ScanManagerScanOptions} scanOptions
   * @param {MetadataOptions} metadataOptions
   * @returns {Promise<{items: Entity[] | undefined, unknownItems: DocumentClientTypes.AttributeMap[] | undefined, cursor: DocumentClientTypes.Key | undefined}>}
   * @internal
   */
  protected async _scan<Entity>(
    scanOptions?: ScanManagerScanOptions,
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: Entity[] | undefined;
    unknownItems: DocumentClientTypes.AttributeMap[] | undefined;
    cursor: DocumentClientTypes.Key | undefined;
  }> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoScanInput = this._dcScanTransformer.toDynamoScanItem(
      {
        ...scanOptions,
        // if requested segmented scan, then apply segment limit or default to limit operator
        limit: scanOptions?.totalSegments
          ? scanOptions?.limitPerSegment
          : scanOptions?.limit,
      },
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

    const entities =
      this._dcScanTransformer.fromDynamoScanResponseItemList<Entity>(
        response.items
      );

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
    scanInput: DocumentClientTypes.ScanInput;
    limit?: number;
    cursor?: DocumentClientTypes.Key;
    itemsFetched?: DocumentClientTypes.ItemList;
    metadataOptions?: MetadataOptions;
  }): Promise<{
    items: DocumentClientTypes.ItemList;
    cursor?: DocumentClientTypes.Key;
  }> {
    // return if the count is already met
    if (limit && this.itemsFetchedSoFarTotalParallelCount >= limit) {
      return {
        items: itemsFetched,
        cursor,
      };
    }

    const {
      LastEvaluatedKey,
      Items = [],
      ConsumedCapacity,
    } = await this.connection.documentClient.scan({
      ...scanInput,
      ExclusiveStartKey: cursor,
    });
    // stats
    if (ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.SCAN_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: ConsumedCapacity,
      });
    }

    // recheck if requested items limit is already met, may be other worker
    // if so drop the result of current request and return
    if (limit && this.itemsFetchedSoFarTotalParallelCount >= limit) {
      return {
        items: itemsFetched,
        cursor,
      };
    }

    itemsFetched = [...itemsFetched, ...Items];
    this.itemsFetchedSoFarTotalParallelCount += Items.length;

    if (LastEvaluatedKey) {
      return this._internalRecursiveScan({
        scanInput,
        limit,
        cursor: LastEvaluatedKey,
        itemsFetched,
        metadataOptions,
      });
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
    scanInput: DocumentClientTypes.ScanInput;
    cursor?: DocumentClientTypes.Key;
    currentCount?: number;
    metadataOptions?: MetadataOptions;
  }): Promise<number> {
    const {Count, LastEvaluatedKey, ConsumedCapacity} =
      await this.connection.documentClient.scan({
        ...scanInput,
        ExclusiveStartKey: cursor,
      });
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

  /**
   * Simple wrapper to limit number of concurrent calls
   * @param promise wraps promise in a limited factory
   * @returns
   */
  private toLimited<T>(promise: Promise<T>) {
    return this.limit(() => promise);
  }
}
