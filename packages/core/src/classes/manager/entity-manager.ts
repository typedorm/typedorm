import {DynamoDB} from 'aws-sdk';
import {
  EntityAttributes,
  EntityTarget,
  MANAGER_NAME,
  QUERY_ORDER,
  STATS_TYPE,
  UpdateAttributes,
} from '@typedorm/common';
import {getDynamoQueryItemsLimit} from '../../helpers/get-dynamo-query-items-limit';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {Connection} from '../connection/connection';
import {DocumentClientRequestTransformer} from '../transformer/document-client-request-transformer';
import {EntityTransformer} from '../transformer/entity-transformer';
import {getConstructorForInstance} from '../../helpers/get-constructor-for-instance';
import {isUsedForPrimaryKey} from '../../helpers/is-used-for-primary-key';
import {isWriteTransactionItemList} from '../transaction/type-guards';
import {isLazyTransactionWriteItemListLoader} from '../transformer/is-lazy-transaction-write-item-list-loader';
import {FilterOptions} from '../expression/filter-options-type';
import {ConditionOptions} from '../expression/condition-options-type';
import {
  KeyConditionOptions,
  ProjectionKeys,
} from '../expression/expression-input-parser';
import {MetadataOptions} from '../transformer/base-transformer';
import {getUniqueRequestId} from '../../helpers/get-unique-request-id';

export interface EntityManagerCreateOptions<Entity> {
  /**
   * @default false
   */
  overwriteIfExists?: boolean;

  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}

export interface EntityManagerUpdateOptions<Entity> {
  /**
   * @default '.'
   */
  nestedKeySeparator?: string;

  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}

export interface EntityManagerDeleteOptions<Entity> {
  /**
   * Specify condition to apply
   */
  where?: ConditionOptions<Entity>;
}

export interface EntityManagerFindOptions<Entity, PartitionKey> {
  /**
   * Index to query, when omitted, query will be run against main table
   */
  queryIndex?: string;

  /**
   * Sort key condition
   * @default none - no sort key condition is applied
   */
  keyCondition?: KeyConditionOptions;

  /**
   * Max number of records to query
   * @default - implicit dynamo db query limit is applied
   */
  limit?: number;

  /**
   * Order to query items in
   * @default ASC
   */
  orderBy?: QUERY_ORDER;

  /**
   * Cursor to traverse from
   */
  cursor?: DynamoDB.DocumentClient.Key;

  /**
   * Specify filter to apply
   * Avoid using this where possible, since filters in dynamodb applies after items
   * are read
   */
  where?: FilterOptions<Entity, PartitionKey>;

  /**
   * Specifies which attributes to fetch
   * @default all attributes are fetched
   */
  select?: ProjectionKeys<Entity>;
}

export interface EntityManagerCountOptions<Entity, PartitionKey> {
  /**
   * Index to query, when omitted, query will be run against main table
   */
  queryIndex?: string;

  /**
   * Sort key condition
   * @default none - no sort key condition is applied
   */
  keyCondition?: KeyConditionOptions;

  /**
   * Specify filter to apply
   * Avoid using this where possible, since filters in dynamodb applies after items
   * are read
   */
  where?: FilterOptions<Entity, PartitionKey>;
}

export interface EntityManagerFindOneOptions<Entity> {
  /**
   * Specifies which attributes to fetch
   * @default all attributes are fetched
   */
  select?: ProjectionKeys<Entity>;
}

export class EntityManager {
  private _dcReqTransformer: DocumentClientRequestTransformer;
  private _entityTransformer: EntityTransformer;

  constructor(protected connection: Connection) {
    this._dcReqTransformer = new DocumentClientRequestTransformer(connection);
    this._entityTransformer = new EntityTransformer(connection);
  }

  /**
   * Creates new record in table with given entity
   * @param entity Entity to add to table as a new record
   */
  async create<Entity>(
    entity: Entity,
    options?: EntityManagerCreateOptions<Entity>,
    metadataOptions?: MetadataOptions
  ): Promise<Entity> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoPutItemInput = this._dcReqTransformer.toDynamoPutItem(
      entity,
      options,
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );
    const entityClass = getConstructorForInstance(entity);

    if (!isWriteTransactionItemList(dynamoPutItemInput)) {
      const response = await this.connection.documentClient
        .put(dynamoPutItemInput)
        .promise();

      // log stats
      if (response?.ConsumedCapacity) {
        this.connection.logger.logStats({
          requestId,
          scope: MANAGER_NAME.ENTITY_MANAGER,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }

      // by default dynamodb does not return attributes on create operation, so return one
      const itemToReturn = this._entityTransformer.fromDynamoEntity<Entity>(
        entityClass,
        dynamoPutItemInput.Item,
        {
          requestId,
        }
      );

      return itemToReturn;
    }

    // dynamoPutItemInput is a transact item list, meaning that it contains one or more unique attributes, which also
    // needs to be created along with original item

    await this.connection.transactionManger.writeRaw(dynamoPutItemInput, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });

    const itemToReturn = this._entityTransformer.fromDynamoEntity<Entity>(
      entityClass,
      // if create operation contains multiple items, first one will the original item
      dynamoPutItemInput[0]?.Put?.Item ?? {},
      {
        requestId,
      }
    );

    return itemToReturn;
  }

  /**
   * Finds an record by given primary key, when table uses composite primary key,
   * props must include both partition and sort key attributes
   * @param entityClass Entity to get value of
   * @param props attributes of entity
   */
  async findOne<Entity, PrimaryKey = Partial<Entity>>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKey,
    options?: EntityManagerFindOneOptions<Entity>,
    metadataOptions?: MetadataOptions
  ): Promise<Entity | undefined> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoGetItem = this._dcReqTransformer.toDynamoGetItem(
      entityClass,
      primaryKeyAttributes,
      options,
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    const response = await this.connection.documentClient
      .get(dynamoGetItem)
      .promise();

    // stats
    if (response?.ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId,
        scope: MANAGER_NAME.ENTITY_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: response.ConsumedCapacity,
      });
    }

    // return early when not found
    if (!response.Item) {
      return;
    }

    const entity = this._entityTransformer.fromDynamoEntity<Entity>(
      entityClass,
      response.Item,
      {
        requestId,
      }
    );

    return entity;
  }

  /**
   * Checks if item with given attribute/primary key exists in the table
   * @param entityClass Entity class
   * @param attributes attributes to find items by, must be primary key attributes or attribute marked as unique
   */
  async exists<Entity, KeyAttributes = Partial<Entity>>(
    entityClass: EntityTarget<Entity>,
    attributes: KeyAttributes,
    metadataOptions?: MetadataOptions
  ) {
    if (isEmptyObject(attributes)) {
      throw new Error("Attributes are required to check it's existence.");
    }

    const metadata = this.connection.getEntityByTarget(entityClass);

    const uniqueAttributesMetadata = this.connection.getUniqueAttributesForEntity(
      entityClass
    );

    const uniqueAttributeNames = uniqueAttributesMetadata.map(
      attr => attr.name
    );

    const {primaryKeyAttributes, uniqueAttributes} = Object.entries(
      attributes
    ).reduce(
      (acc, [attrKey, value]) => {
        if (isUsedForPrimaryKey(metadata.schema.primaryKey, attrKey)) {
          acc.primaryKeyAttributes[attrKey] = value;
        } else if (uniqueAttributeNames.includes(attrKey)) {
          acc.uniqueAttributes[attrKey] = value;
        } else {
          // any attributes that are not part of either primary key or is not marked as unique will be rejected
          throw new Error(
            `Only attributes that are part of primary key or is marked as unique attribute can be queried, attribute "${attrKey} is neither."`
          );
        }
        return acc;
      },
      {
        primaryKeyAttributes: {} as any,
        uniqueAttributes: {} as any,
      }
    );

    if (
      !isEmptyObject(primaryKeyAttributes) &&
      !isEmptyObject(uniqueAttributes)
    ) {
      throw new Error(
        'Can not search both primary key and unique attributes at the same time.'
      );
    }

    // find item by primary key if it can be resolved
    if (!isEmptyObject(primaryKeyAttributes)) {
      return !!(await this.findOne(
        entityClass,
        attributes,
        undefined,
        metadataOptions
      ));
    }

    // try finding entity by unique attribute
    if (!isEmptyObject(uniqueAttributes)) {
      const requestId = getUniqueRequestId(metadataOptions?.requestId);
      if (Object.keys(uniqueAttributes).length > 1) {
        throw new Error('Can only query one unique attribute at a time.');
      }
      const [attrName, attrValue] = Object.entries(uniqueAttributes)[0];

      const uniqueAttributePrimaryKey = uniqueAttributesMetadata.find(
        meta => meta.name === attrName
      )?.unique;

      if (!uniqueAttributePrimaryKey) {
        console.log(`Could not find metadata for attribute ${attrName}`);
        return false;
      }

      const parsedPrimaryKey = this._entityTransformer.getParsedPrimaryKey(
        metadata.table,
        uniqueAttributePrimaryKey,
        {[attrName]: attrValue}
      );

      const response = await this.connection.documentClient
        .get({
          Key: {...parsedPrimaryKey},
          TableName: metadata.table.name,
          ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
        })
        .promise();

      // stats
      if (response?.ConsumedCapacity) {
        this.connection.logger.logStats({
          requestId,
          scope: MANAGER_NAME.ENTITY_MANAGER,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }

      return !!response.Item;
    }
    // if none of the above, item does not exist
    return false;
  }

  /**
   *
   * @param entityClass Entity class to update
   * @param primaryKeyAttributes Primary key
   * @param body Attributes to update
   * @param options update options
   */
  async update<Entity, PrimaryKey = Partial<Entity>>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKey,
    body: UpdateAttributes<Entity, PrimaryKey>,
    options?: EntityManagerUpdateOptions<Entity>,
    metadataOptions?: MetadataOptions
  ): Promise<Entity | undefined> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoUpdateItem = this._dcReqTransformer.toDynamoUpdateItem<
      Entity,
      PrimaryKey
    >(entityClass, primaryKeyAttributes, body, options, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });

    if (!isLazyTransactionWriteItemListLoader(dynamoUpdateItem)) {
      const response = await this.connection.documentClient
        .update(dynamoUpdateItem)
        .promise();

      // stats
      if (response.ConsumedCapacity) {
        this.connection.logger.logStats({
          requestId,
          scope: MANAGER_NAME.ENTITY_MANAGER,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }

      return this._entityTransformer.fromDynamoEntity<Entity>(
        entityClass,
        // return all new attributes
        response.Attributes ?? {},
        {
          requestId,
        }
      );
    }

    // first get existing item, so that we can safely clear previous unique attributes
    const existingItem = await this.findOne<Entity, PrimaryKey>(
      entityClass,
      primaryKeyAttributes,
      undefined,
      metadataOptions
    );

    if (!existingItem) {
      throw new Error(
        `Failed to update entity, could not find entity with primary key "${JSON.stringify(
          primaryKeyAttributes
        )}"`
      );
    }

    const updateItemList = dynamoUpdateItem.lazyLoadTransactionWriteItems(
      existingItem
    );

    await this.connection.transactionManger.writeRaw(updateItemList, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });
    return this.findOne<Entity, PrimaryKey>(
      entityClass,
      primaryKeyAttributes,
      undefined,
      metadataOptions
    );
  }

  /**
   * Deletes an entity by primary key
   * @param entityClass Entity Class to delete
   * @param primaryKeyAttributes Entity Primary key
   */
  async delete<Entity, PrimaryKeyAttributes = Partial<Entity>>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKeyAttributes,
    options?: EntityManagerDeleteOptions<Entity>,
    metadataOptions?: MetadataOptions
  ) {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoDeleteItem = this._dcReqTransformer.toDynamoDeleteItem<
      Entity,
      PrimaryKeyAttributes
    >(entityClass, primaryKeyAttributes, options, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });

    if (!isLazyTransactionWriteItemListLoader(dynamoDeleteItem)) {
      const response = await this.connection.documentClient
        .delete(dynamoDeleteItem)
        .promise();

      // stats
      if (response.ConsumedCapacity) {
        this.connection.logger.logStats({
          requestId,
          scope: MANAGER_NAME.ENTITY_MANAGER,
          statsType: STATS_TYPE.CONSUMED_CAPACITY,
          consumedCapacityData: response.ConsumedCapacity,
        });
      }

      return {
        success: true,
      };
    }

    // first get existing item, so that we can safely clear previous unique attributes
    const existingItem = await this.findOne<Entity, PrimaryKeyAttributes>(
      entityClass,
      primaryKeyAttributes,
      undefined,
      metadataOptions
    );

    if (!existingItem) {
      throw new Error(
        `Failed to update entity, could not find entity with primary key "${JSON.stringify(
          primaryKeyAttributes
        )}"`
      );
    }

    const deleteItemList = dynamoDeleteItem.lazyLoadTransactionWriteItems(
      existingItem
    );

    // delete main item and all it's unique attributes as part of single transaction
    await this.connection.transactionManger.writeRaw(deleteItemList, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });
    return {
      success: true,
    };
  }

  /**
   * Find items using declarative query options
   * @param entityClass Entity to query
   * @param partitionKey Partition key attributes, If querying an index,
   * this is the partition key attributes of that index
   * @param queryOptions Query Options
   */
  async find<Entity, PartitionKey = Partial<EntityAttributes<Entity>> | string>(
    entityClass: EntityTarget<Entity>,
    partitionKey: PartitionKey,
    queryOptions?: EntityManagerFindOptions<Entity, PartitionKey>,
    metadataOptions?: MetadataOptions
  ): Promise<{
    items: DynamoDB.DocumentClient.ItemList;
    cursor?: DynamoDB.DocumentClient.Key | undefined;
  }> {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoQueryItem = this._dcReqTransformer.toDynamoQueryItem<
      Entity,
      PartitionKey
    >(entityClass, partitionKey, queryOptions, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });

    const response = await this._internalRecursiveQuery({
      queryInput: dynamoQueryItem,
      // if no explicit limit is set, always fall back to imposing implicit limit
      limit: queryOptions?.limit ?? getDynamoQueryItemsLimit(),
      cursor: queryOptions?.cursor,
      metadataOptions: {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      },
    });

    return {
      ...response,
      items: response.items.map(item =>
        this._entityTransformer.fromDynamoEntity<Entity>(entityClass, item, {
          requestId,
        })
      ),
    };
  }

  /**
   * Returns a count of total items matching ther query
   * @param entityClass Entity to query
   * @param partitionKey Partition key attributes, If querying an index,
   * this is the partition key attributes of that index
   * @param queryOptions Count Query Options
   */
  async count<
    Entity,
    PartitionKey = Partial<EntityAttributes<Entity>> | string
  >(
    entityClass: EntityTarget<Entity>,
    partitionKey: PartitionKey,
    queryOptions?: EntityManagerCountOptions<Entity, PartitionKey>,
    metadataOptions?: MetadataOptions
  ) {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const dynamoQueryItem = this._dcReqTransformer.toDynamoQueryItem<
      Entity,
      PartitionKey
    >(
      entityClass,
      partitionKey,
      {...queryOptions, onlyCount: true, select: undefined}, // select projection and count can not be used together
      {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      }
    );

    const count = await this._internalRecursiveCount({
      queryInput: dynamoQueryItem,
      metadataOptions: {
        requestId,
        returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      },
    });

    return count;
  }

  /**
   * Recursively queries all items from table
   * @param param Query params
   */
  private async _internalRecursiveQuery({
    queryInput,
    limit,
    cursor,
    itemsFetched = [],
    metadataOptions,
  }: {
    queryInput: DynamoDB.DocumentClient.QueryInput;
    limit: number;
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
      .query({...queryInput, ExclusiveStartKey: cursor})
      .promise();

    // stats
    if (ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.ENTITY_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: ConsumedCapacity,
      });
    }

    itemsFetched = [...itemsFetched, ...Items];

    if (itemsFetched.length < limit && LastEvaluatedKey) {
      return this._internalRecursiveQuery({
        queryInput,
        limit,
        cursor: LastEvaluatedKey,
        itemsFetched,
        metadataOptions,
      });
    }
    return {items: itemsFetched, cursor: LastEvaluatedKey};
  }

  /**
   * Recursively counts all items from table
   * @param param Query params
   */
  private async _internalRecursiveCount({
    queryInput,
    cursor,
    currentCount = 0,
    metadataOptions,
  }: {
    queryInput: DynamoDB.DocumentClient.QueryInput;
    cursor?: DynamoDB.DocumentClient.Key;
    currentCount?: number;
    metadataOptions?: MetadataOptions;
  }): Promise<number> {
    const {
      LastEvaluatedKey,
      Count,
      ConsumedCapacity,
    } = await this.connection.documentClient
      .query({...queryInput, ExclusiveStartKey: cursor})
      .promise();

    // stats
    if (ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.ENTITY_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: ConsumedCapacity,
      });
    }

    currentCount += Count || 0;

    if (LastEvaluatedKey) {
      return this._internalRecursiveCount({
        queryInput,
        cursor: LastEvaluatedKey,
        currentCount,
        metadataOptions,
      });
    }
    return currentCount;
  }
}
