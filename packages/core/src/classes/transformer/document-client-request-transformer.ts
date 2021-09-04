import {
  EntityTarget,
  INDEX_TYPE,
  QUERY_ORDER,
  Replace,
  RETURN_VALUES,
  Table,
  TRANSFORM_TYPE,
  IndexOptions,
  QUERY_SELECT_TYPE,
  NoSuchIndexFoundError,
  InvalidFilterInputError,
  InvalidSelectInputError,
  InvalidUniqueAttributeUpdateError,
  InvalidDynamicUpdateAttributeValueError,
} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {dropProp} from '../../helpers/drop-prop';
import {getConstructorForInstance} from '../../helpers/get-constructor-for-instance';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {parseKey} from '../../helpers/parse-key';
import {KeyCondition} from '../expression/key-condition';
import {Connection} from '../connection/connection';
import {ExpressionBuilder} from '../expression/expression-builder';
import {AttributeMetadata} from '../metadata/attribute-metadata';
import {DynamoEntitySchemaPrimaryKey} from '../metadata/entity-metadata';
import {BaseTransformer, MetadataOptions} from './base-transformer';
import {LazyTransactionWriteItemListLoader} from './is-lazy-transaction-write-item-list-loader';
import {KeyConditionOptions} from '../expression/key-condition-options-type';
import {UpdateBody} from '../expression/update-body-type';
import {isObject} from '../../helpers/is-object';

export interface ManagerToDynamoPutItemOptions {
  /**
   * @default false
   */
  overwriteIfExists?: boolean;

  where?: any;
}

export interface ManagerToDynamoUpdateItemsOptions {
  /**
   * key separator
   * @default '.''
   */
  nestedKeySeparator?: string;

  where?: any;
}

export interface ManagerToDynamoDeleteItemsOptions {
  where?: any;
}

export interface ManagerToDynamoQueryItemsOptions {
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

  where?: any;

  select?: any[];

  onlyCount?: boolean;
}

export interface ManagerToDynamoGetItemOptions {
  select?: any[];
}

export class DocumentClientRequestTransformer extends BaseTransformer {
  protected _expressionBuilder: ExpressionBuilder;

  constructor(connection: Connection) {
    super(connection);
    this._expressionBuilder = new ExpressionBuilder();
  }

  get expressionBuilder() {
    return this._expressionBuilder;
  }

  get expressionInputParser() {
    return this._expressionInputParser;
  }

  toDynamoPutItem<Entity>(
    entity: Entity,
    options?: ManagerToDynamoPutItemOptions,
    metadataOptions?: MetadataOptions
  ):
    | DynamoDB.DocumentClient.PutItemInput
    | DynamoDB.DocumentClient.TransactWriteItemList {
    const entityClass = getConstructorForInstance(entity);
    const {table, internalAttributes, name} = this.connection.getEntityByTarget(
      entityClass
    );

    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.PUT,
      prefix: 'Before',
      entityName: name,
      primaryKey: null,
      body: entity,
      options,
    });

    const uniqueAttributes = this.connection.getUniqueAttributesForEntity(
      entityClass
    ) as AttributeMetadata[];

    // include attributes with default values in
    const dynamoEntity = this.toDynamoEntity(entity);

    const entityInternalAttributes = internalAttributes.reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as DynamoDB.DocumentClient.PutItemInputAttributeMap);

    let dynamoPutItem = {
      Item: {
        ...entityInternalAttributes,
        ...dynamoEntity,
      },
      TableName: table.name,
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    } as DynamoDB.DocumentClient.PutItemInput;

    // apply attribute not exist condition when creating unique
    const uniqueRecordConditionExpression = this.expressionBuilder.buildUniqueRecordConditionExpression(
      table
    );

    // always prevent overwriting data until explicitly told to do otherwise
    if (!options?.overwriteIfExists) {
      dynamoPutItem = {
        ...dynamoPutItem,
        ...uniqueRecordConditionExpression,
      };
    }

    // if there is `where` condition options exists, build condition expression
    if (options?.where && !isEmptyObject(options?.where)) {
      const condition = this.expressionInputParser.parseToCondition(
        options?.where
      );

      if (!condition) {
        throw new Error(
          `Failed to build condition expression for input: ${JSON.stringify(
            options?.where
          )}`
        );
      }

      const {
        ConditionExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = this.expressionBuilder.buildConditionExpression(condition);

      // by default, entity manger appends unique record condition expression to avoid overwriting items if they already exist
      // so handle that
      const mergedExp = this._expressionBuilder.andMergeConditionExpressions(
        {
          ConditionExpression: dynamoPutItem.ConditionExpression,
          ExpressionAttributeNames: dynamoPutItem.ExpressionAttributeNames,
          ExpressionAttributeValues: dynamoPutItem.ExpressionAttributeValues,
        },
        {
          ConditionExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
        }
      );

      dynamoPutItem.ConditionExpression = mergedExp.ConditionExpression;
      dynamoPutItem.ExpressionAttributeNames =
        mergedExp.ExpressionAttributeNames;
      dynamoPutItem.ExpressionAttributeValues =
        mergedExp.ExpressionAttributeValues;
    }

    // no unique attributes exist, so return early
    if (!uniqueAttributes.length) {
      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.PUT,
        prefix: 'After',
        entityName: name,
        primaryKey: null,
        body: dynamoPutItem,
      });

      return dynamoPutItem;
    }

    // if there are unique attributes, return transaction list item
    let uniqueAttributePutItems: DynamoDB.DocumentClient.TransactWriteItemList = [];
    if (uniqueAttributes.length) {
      uniqueAttributePutItems = uniqueAttributes.map(attr => {
        const attributeValue = (entity as any)[attr.name];

        if (!attributeValue) {
          throw new Error(
            `All unique attributes are required, Could not resolve value for unique attribute "${attr.name}."`
          );
        }

        if (!attr.unique) {
          throw new Error(
            'All unique attributes metadata must be marked unique.'
          );
        }

        const uniqueItemPrimaryKey = this.getParsedPrimaryKey(
          table,
          attr.unique,
          entity
        );

        return {
          Put: {
            Item: uniqueItemPrimaryKey,
            TableName: table.name,
            ...uniqueRecordConditionExpression,
          },
        };
      });
    }

    const uniqueAttributesPutItems = [
      {Put: dynamoPutItem},
      ...uniqueAttributePutItems,
    ];

    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.PUT,
      prefix: 'After',
      entityName: name,
      primaryKey: null,
      body: uniqueAttributesPutItems,
    });

    return uniqueAttributesPutItems;
  }

  toDynamoGetItem<Entity, PrimaryKey>(
    entityClass: EntityTarget<Entity>,
    primaryKey: PrimaryKey,
    options?: ManagerToDynamoGetItemOptions,
    metadataOptions?: MetadataOptions
  ): DynamoDB.DocumentClient.GetItemInput {
    const metadata = this.connection.getEntityByTarget(entityClass);

    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.GET,
      prefix: 'Before',
      entityName: metadata.name,
      primaryKey,
    });

    const tableName = this.getTableNameForEntity(entityClass);

    const parsedPrimaryKey = this.getParsedPrimaryKey(
      metadata.table,
      metadata.schema.primaryKey,
      primaryKey
    );

    if (isEmptyObject(parsedPrimaryKey)) {
      throw new Error('Primary could not be resolved');
    }

    let transformBody = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    } as DynamoDB.DocumentClient.GetItemInput;

    // early return if no options were provided
    if (!options || isEmptyObject(options)) {
      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.GET,
        prefix: 'After',
        entityName: metadata.name,
        primaryKey: null,
        body: transformBody,
      });
      return transformBody;
    }

    if (options.select?.length) {
      const projection = this.expressionInputParser.parseToProjection(
        options.select
      );

      if (!projection) {
        throw new Error(
          `Failed to build projection expression for input: ${JSON.stringify(
            options.select
          )}`
        );
      }

      const {
        ProjectionExpression,
        ExpressionAttributeNames,
      } = this.expressionBuilder.buildProjectionExpression(projection);

      transformBody = {
        ...transformBody,
        ProjectionExpression,
        ExpressionAttributeNames: {
          ...transformBody.ExpressionAttributeNames,
          ...ExpressionAttributeNames,
        },
      };
    }

    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.GET,
      prefix: 'After',
      entityName: metadata.name,
      primaryKey: null,
      body: transformBody,
    });
    return transformBody;
  }

  toDynamoUpdateItem<Entity, PrimaryKey, AdditionalProperties = Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKey,
    body: UpdateBody<Entity, AdditionalProperties>,
    options: ManagerToDynamoUpdateItemsOptions = {},
    metadataOptions?: MetadataOptions
  ):
    | DynamoDB.DocumentClient.UpdateItemInput
    | LazyTransactionWriteItemListLoader {
    // default values
    const {nestedKeySeparator = '.'} = options;

    if (!this.connection.hasMetadata(entityClass)) {
      throw new Error(`No metadata found for class "${entityClass.name}".`);
    }

    const metadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.UPDATE,
      prefix: 'Before',
      entityName: metadata.name,
      primaryKey: primaryKeyAttributes,
      body,
      options,
    });
    const tableName = metadata.table.name;

    const parsedPrimaryKey = this.getParsedPrimaryKey(
      metadata.table,
      metadata.schema.primaryKey,
      primaryKeyAttributes
    );

    if (isEmptyObject(parsedPrimaryKey)) {
      throw new Error('Primary could not be resolved');
    }

    // get all the attributes for entity that are marked as to be auto update
    const autoUpdateAttributes = this.connection.getAutoUpdateAttributes(
      entityClass
    );

    // check if auto update attributes are not referenced by primary key
    const formattedAutoUpdateAttributes = autoUpdateAttributes.reduce(
      (acc, attr) => {
        acc[attr.name] = attr.autoGenerateValue(attr.strategy);
        return acc;
      },
      {} as {[key: string]: any}
    );
    const rawAttributesToUpdate = {
      ...body,
      ...formattedAutoUpdateAttributes,
    };

    /**
     * 1.0 - analyze attributes' value type (static/dynamic)
     *
     * Here we parse all attributes to it's update value and determine
     * if it's value can be statically inferred
     */
    const staticOrDynamicUpdateAttributesWithMetadata = Object.entries({
      ...rawAttributesToUpdate,
    }).reduce(
      (acc, [attrName, attrValue]) => {
        const valueWithType = this.expressionInputParser.parseAttributeToUpdateValue(
          attrName,
          attrValue
        ) as {value: any; type: 'static' | 'dynamic'};

        acc.transformed[attrName] = valueWithType.value;
        acc.typeMetadata[attrName] = valueWithType.type;
        return acc;
      },
      {transformed: {}, typeMetadata: {}} as {
        transformed: Record<string, any>;
        typeMetadata: Record<string, 'dynamic' | 'static'>;
      }
    );

    /**
     * 2.0 - apply custom class transformation on static attributes
     *
     * we manually need to replace the constructor of the attributes to update
     * with the entity class, so that we can pass it through to class-transformer
     * to have all transformer metadata applied.
     */

    const onlyStaticAttributes = Object.entries(
      staticOrDynamicUpdateAttributesWithMetadata.transformed
    ).reduce((acc, [attrKey, attrValue]) => {
      if (
        staticOrDynamicUpdateAttributesWithMetadata.typeMetadata[attrKey] ===
        'static'
      ) {
        acc[attrKey] = attrValue;
      }
      return acc;
    }, {} as any);
    onlyStaticAttributes.constructor = entityClass;
    const classTransformedStaticAttributes = this.applyClassTransformerFormations(
      onlyStaticAttributes
    ) as Entity;
    staticOrDynamicUpdateAttributesWithMetadata.transformed = {
      ...staticOrDynamicUpdateAttributesWithMetadata.transformed,
      ...classTransformedStaticAttributes,
    };

    /**
     * 3.0 - Get referenced unique attributes and validate that current update body can be safely applied
     */
    const uniqueAttributesToUpdate = this.connection
      .getUniqueAttributesForEntity(entityClass)
      .filter(attr => !!(body as any)[attr.name])
      .map(attr => {
        // TODO: support updating unique attributes with dynamic exp
        // we can't allow updating unique attributes when they contain dynamic update value
        if (
          staticOrDynamicUpdateAttributesWithMetadata.typeMetadata[
            attr.name
          ] === 'dynamic'
        ) {
          throw new InvalidDynamicUpdateAttributeValueError(
            attr.name,
            staticOrDynamicUpdateAttributesWithMetadata.transformed[attr.name]
          );
        }
        return attr;
      });

    /**
     * 3.1 - Get referenced primary key attributes and validate that current update body can be safely applied
     */
    const affectedPrimaryKeyAttributes = this.getAffectedPrimaryKeyAttributes<
      Entity
    >(
      entityClass,
      staticOrDynamicUpdateAttributesWithMetadata.transformed,
      staticOrDynamicUpdateAttributesWithMetadata.typeMetadata
    );

    // validate primary key attributes
    if (!isEmptyObject(affectedPrimaryKeyAttributes)) {
      // updates are not allowed for attributes that unique and also references primary key.
      if (uniqueAttributesToUpdate.length) {
        throw new InvalidUniqueAttributeUpdateError(
          affectedPrimaryKeyAttributes!,
          uniqueAttributesToUpdate.map(attr => attr.name)
        );
      }
    }

    /**
     * 3.2 - Get referenced indexes' attributes and validate that current update body can be safely applied
     */
    const affectedIndexes = this.getAffectedIndexesForAttributes<Entity>(
      entityClass,
      staticOrDynamicUpdateAttributesWithMetadata.transformed,
      staticOrDynamicUpdateAttributesWithMetadata.typeMetadata,
      {
        nestedKeySeparator,
      }
    );

    /**
     * 4.0 - Build update Item body with given condition and options
     */
    const itemToUpdate:
      | DynamoDB.DocumentClient.UpdateItemInput
      | DynamoDB.DocumentClient.PutItemInput = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      // request all new attributes
      ReturnValues: RETURN_VALUES.ALL_NEW,
    };

    /**
     * 4.1 - if 'where' was provided, build condition expression
     */
    if (options.where && !isEmptyObject(options.where)) {
      const condition = this.expressionInputParser.parseToCondition(
        options.where
      );

      if (!condition) {
        throw new Error(
          `Failed to build condition expression for input: ${JSON.stringify(
            options.where
          )}`
        );
      }

      const {
        ConditionExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = this.expressionBuilder.buildConditionExpression(condition);

      // append condition expression if one was built
      itemToUpdate.ConditionExpression = ConditionExpression;
      itemToUpdate.ExpressionAttributeNames = {
        ...ExpressionAttributeNames,
        ...itemToUpdate.ExpressionAttributeNames,
      };
      itemToUpdate.ExpressionAttributeValues = {
        ...ExpressionAttributeValues,
        ...itemToUpdate.ExpressionAttributeValues,
      };
    }

    /**
     * 5.0 - update contains primary key attributes so it must be lazily updated
     * This requires deleting old item and writing new item to the table both in a transaction
     */
    if (
      isObject(affectedPrimaryKeyAttributes) &&
      !isEmptyObject(affectedPrimaryKeyAttributes)
    ) {
      const lazyLoadTransactionWriteItems = this.lazyToDynamoUpdatePrimaryKeyFactory(
        metadata.table,
        metadata.name,
        metadata.schema.primaryKey,
        {
          Item: {
            ...affectedPrimaryKeyAttributes,
            ...affectedIndexes,
            ...staticOrDynamicUpdateAttributesWithMetadata.transformed,
          },
          TableName: metadata.table.name,
          ReturnConsumedCapacity: itemToUpdate.ReturnConsumedCapacity,
          ReturnValues: itemToUpdate.ReturnValues,
          ConditionExpression: itemToUpdate.ConditionExpression,
          ExpressionAttributeNames: itemToUpdate.ExpressionAttributeNames,
          ExpressionAttributeValues: itemToUpdate.ExpressionAttributeValues,
        },
        metadataOptions
      );

      return {
        primaryKeyAttributes,
        entityClass,
        lazyLoadTransactionWriteItems,
      };
    }

    /**
     * 5.0.1 - build update expression with user provided body and all other auto transformation
     */
    const update = this.expressionInputParser.parseToUpdate(
      {
        ...rawAttributesToUpdate,
        ...affectedIndexes,
      },
      staticOrDynamicUpdateAttributesWithMetadata.transformed
    );

    const {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } = this.expressionBuilder.buildUpdateExpression(update);
    itemToUpdate.UpdateExpression = UpdateExpression;
    itemToUpdate.ExpressionAttributeNames = {
      ...ExpressionAttributeNames,
      ...itemToUpdate.ExpressionAttributeNames,
    };
    itemToUpdate.ExpressionAttributeValues = {
      ...ExpressionAttributeValues,
      ...itemToUpdate.ExpressionAttributeValues,
    };

    /**
     * 5.1 - Update contains unique attributes, build a lazy unique attributes loader and return
     */
    if (uniqueAttributesToUpdate.length) {
      // if there are unique attributes, return a lazy loader, which will return write item list
      const lazyLoadTransactionWriteItems = this.lazyToDynamoUpdateUniqueItemFactory<
        Entity
      >(
        metadata.table,
        metadata.name,
        uniqueAttributesToUpdate,
        dropProp(itemToUpdate, 'ReturnValues'),
        staticOrDynamicUpdateAttributesWithMetadata.transformed,
        metadataOptions
      );

      return {
        primaryKeyAttributes,
        entityClass,
        lazyLoadTransactionWriteItems,
      };
    }

    /**
     * 5.2 - return simple update body
     */
    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.UPDATE,
      prefix: 'After',
      entityName: metadata.name,
      primaryKey: null,
      body: itemToUpdate,
    });
    return itemToUpdate;
  }

  toDynamoDeleteItem<Entity, PrimaryKey>(
    entityClass: EntityTarget<Entity>,
    primaryKey: PrimaryKey,
    options?: ManagerToDynamoDeleteItemsOptions,
    metadataOptions?: MetadataOptions
  ):
    | DynamoDB.DocumentClient.DeleteItemInput
    | LazyTransactionWriteItemListLoader {
    const metadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.DELETE,
      prefix: 'Before',
      entityName: metadata.name,
      primaryKey,
    });
    const tableName = metadata.table.name;

    const parsedPrimaryKey = this.getParsedPrimaryKey(
      metadata.table,
      metadata.schema.primaryKey,
      primaryKey
    );

    if (isEmptyObject(parsedPrimaryKey)) {
      throw new Error('Primary could not be resolved');
    }

    const uniqueAttributesToRemove = this.connection.getUniqueAttributesForEntity(
      entityClass
    );

    const mainItemToRemove: DynamoDB.DocumentClient.DeleteItemInput = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    };

    if (options?.where && !isEmptyObject(options.where)) {
      const condition = this.expressionInputParser.parseToCondition(
        options?.where
      );

      if (!condition) {
        throw new Error(
          `Failed to build condition expression for input: ${JSON.stringify(
            options?.where
          )}`
        );
      }

      const {
        ConditionExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = this.expressionBuilder.buildConditionExpression(condition);

      mainItemToRemove.ConditionExpression = ConditionExpression;
      mainItemToRemove.ExpressionAttributeNames = {
        ...mainItemToRemove.ExpressionAttributeNames,
        ...ExpressionAttributeNames,
      };

      mainItemToRemove.ExpressionAttributeValues = {
        ...mainItemToRemove.ExpressionAttributeValues,
        ...ExpressionAttributeValues,
      };
    }

    if (!uniqueAttributesToRemove?.length) {
      // if item does not have any unique attributes return it as is
      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.DELETE,
        prefix: 'After',
        entityName: metadata.name,
        primaryKey,
      });
      return mainItemToRemove;
    }

    // or return lazy resolver
    const lazyLoadTransactionWriteItems = this.lazyToDynamoRemoveItemFactory(
      metadata.table,
      metadata.name,
      uniqueAttributesToRemove,
      mainItemToRemove,
      metadataOptions
    );

    return {
      primaryKeyAttributes: primaryKey,
      entityClass,
      lazyLoadTransactionWriteItems,
    };
  }

  toDynamoQueryItem<Entity, PartitionKeyAttributes>(
    entityClass: EntityTarget<Entity>,
    partitionKeyAttributes: PartitionKeyAttributes | string,
    queryOptions?: ManagerToDynamoQueryItemsOptions,
    metadataOptions?: MetadataOptions
  ): DynamoDB.DocumentClient.QueryInput {
    const {table, schema, name} = this.connection.getEntityByTarget(
      entityClass
    );
    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.QUERY,
      prefix: 'Before',
      entityName: name,
      primaryKey: partitionKeyAttributes,
      options: queryOptions,
    });
    const queryIndexName = queryOptions?.queryIndex;
    let indexToQuery: IndexOptions | undefined;
    if (queryIndexName) {
      const matchingIndex = table.getIndexByKey(queryIndexName);
      if (!matchingIndex) {
        throw new NoSuchIndexFoundError(table.name, queryIndexName);
      }

      const matchingIndexOnEntity =
        schema.indexes && schema.indexes[queryIndexName];

      if (!matchingIndexOnEntity) {
        throw new Error(
          `Requested to query items from index "${queryIndexName}", but no such index exists on entity.`
        );
      }
      indexToQuery = matchingIndex;
    }

    // query will be executed against main table or
    // if querying local  index, then partition key will be same as main table
    const parsedPartitionKey = {} as {name: string; value: any};
    if (
      !queryIndexName ||
      !indexToQuery ||
      indexToQuery?.type === INDEX_TYPE.LSI
    ) {
      parsedPartitionKey.name = table.partitionKey;
      parsedPartitionKey.value =
        typeof partitionKeyAttributes === 'string'
          ? partitionKeyAttributes
          : parseKey(
              schema.primaryKey.attributes[table.partitionKey],
              partitionKeyAttributes
            );
    } else {
      // query is to be executed against global secondary index
      parsedPartitionKey.name = indexToQuery.partitionKey;
      const schemaForIndexToQuery = (schema.indexes ?? {})[queryIndexName];

      parsedPartitionKey.value =
        typeof partitionKeyAttributes === 'string'
          ? partitionKeyAttributes
          : parseKey(
              schemaForIndexToQuery.attributes[indexToQuery.partitionKey],
              partitionKeyAttributes
            );
    }

    const partitionKeyCondition = new KeyCondition().equals(
      parsedPartitionKey.name,
      parsedPartitionKey.value
    );

    const partitionKeyConditionExpression = this.expressionBuilder.buildKeyConditionExpression(
      partitionKeyCondition
    );

    // if no query options are present, resolve key condition expression
    if (!queryOptions || isEmptyObject(queryOptions)) {
      const transformedQueryItem = {
        TableName: table.name,
        IndexName: queryIndexName,
        ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
        ...partitionKeyConditionExpression,
      };

      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.QUERY,
        prefix: 'After',
        entityName: name,
        primaryKey: partitionKeyAttributes,
        body: transformedQueryItem,
      });

      return transformedQueryItem;
    }

    const parsedSortKey = {} as {name: string};
    // if no we are not querying against index, validate if table is using composite key
    if (!indexToQuery) {
      if (!table.usesCompositeKey()) {
        throw new Error(
          `Table ${table.name} does not use composite key, thus querying a sort key is not allowed`
        );
      }

      parsedSortKey.name = table.sortKey;
    } else {
      parsedSortKey.name = indexToQuery.sortKey;
    }

    // at this point we have resolved partition key and table to query
    const {
      keyCondition,
      limit,
      orderBy: order,
      where,
      select,
      onlyCount,
    } = queryOptions;

    let queryInputParams = {
      TableName: table.name,
      IndexName: queryIndexName,
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
      Limit: limit,
      ScanIndexForward: !order || order === QUERY_ORDER.ASC,
      ...partitionKeyConditionExpression,
    } as DynamoDB.DocumentClient.QueryInput;

    // if key condition was provided
    if (keyCondition && !isEmptyObject(keyCondition)) {
      // build sort key condition
      const sortKeyCondition = this.expressionInputParser.parseToKeyCondition(
        parsedSortKey.name,
        keyCondition
      );

      // if condition resolution was successful, we can merge both partition and sort key conditions now
      const {
        KeyConditionExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = this.expressionBuilder.buildKeyConditionExpression(
        partitionKeyCondition.merge(sortKeyCondition)
      );

      queryInputParams = {
        ...queryInputParams,
        KeyConditionExpression,
        ExpressionAttributeNames: {
          ...queryInputParams.ExpressionAttributeNames,
          ...ExpressionAttributeNames,
        },
        ExpressionAttributeValues: {
          ...queryInputParams.ExpressionAttributeValues,
          ...ExpressionAttributeValues,
        },
      };
    }

    // when filter conditions are given generate filter expression
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

      queryInputParams = {
        ...queryInputParams,
        FilterExpression,
        ExpressionAttributeNames: {
          ...queryInputParams.ExpressionAttributeNames,
          ...ExpressionAttributeNames,
        },
        ExpressionAttributeValues: {
          ...queryInputParams.ExpressionAttributeValues,
          ...ExpressionAttributeValues,
        },
      };
    }

    // check if only the count was requested
    if (onlyCount) {
      if (select?.length) {
        throw new Error(
          'Attributes projection and count can not be used together'
        );
      }
      // count and projection selection can not be used together
      queryInputParams.Select = QUERY_SELECT_TYPE.COUNT;
    }

    // when projection keys are provided
    if (select && select.length) {
      const projection = this.expressionInputParser.parseToProjection(select);

      if (!projection) {
        throw new InvalidSelectInputError(select);
      }

      const {
        ProjectionExpression,
        ExpressionAttributeNames,
      } = this.expressionBuilder.buildProjectionExpression(projection);

      queryInputParams = {
        ...queryInputParams,
        ProjectionExpression,
        ExpressionAttributeNames: {
          ...queryInputParams.ExpressionAttributeNames,
          ...ExpressionAttributeNames,
        },
      };
    }

    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.QUERY,
      prefix: 'After',
      entityName: name,
      primaryKey: partitionKeyAttributes,
      body: queryInputParams,
    });

    return queryInputParams;
  }

  private lazyToDynamoUpdatePrimaryKeyFactory(
    table: Table,
    entityName: string,
    primaryKeySchema: DynamoEntitySchemaPrimaryKey,
    newItemBody: DynamoDB.DocumentClient.PutItemInput,
    metadataOptions?: MetadataOptions
  ) {
    return (previousItemBody: any) => {
      const updateTransactionItems: DynamoDB.DocumentClient.TransactWriteItemList = [
        {
          Put: {
            ...newItemBody,
            // import existing current item
            Item: {...previousItemBody, ...newItemBody.Item},
          },
        },
      ] as DynamoDB.DocumentClient.TransactWriteItem[];

      // if there was a previous existing item, basically remove it as part of this transaction
      if (previousItemBody && !isEmptyObject(previousItemBody)) {
        updateTransactionItems.push({
          Delete: {
            TableName: table.name,
            Key: {
              ...this.getParsedPrimaryKey(
                table,
                primaryKeySchema,
                previousItemBody
              ),
            },
          },
        });
      }

      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.UPDATE,
        prefix: 'After',
        entityName,
        primaryKey: null,
        body: updateTransactionItems,
      });

      return updateTransactionItems;
    };
  }

  /**
   * Lazy build update item input
   * This is helpful in cases where we don't you have all the attributes to build item input, and the caller will need to
   * to perform some sort of async call in order to fetch attributes and proceed with build
   *
   */
  private lazyToDynamoUpdateUniqueItemFactory<Entity>(
    table: Table,
    entityName: string,
    uniqueAttributesToUpdate: Replace<
      AttributeMetadata,
      'unique',
      {
        unique: DynamoEntitySchemaPrimaryKey;
      }
    >[],
    mainItem: DynamoDB.DocumentClient.UpdateItemInput,
    newBody: any,
    metadataOptions?: MetadataOptions
  ) {
    // returns transact write item list
    return (previousItemBody: any) => {
      // updating unique attributes also require checking if new value exists
      const uniqueRecordConditionExpression = this.expressionBuilder.buildUniqueRecordConditionExpression(
        table
      );

      // map all unique attributes to [put, delete] item tuple
      const uniqueAttributeInputs: DynamoDB.DocumentClient.TransactWriteItemList = uniqueAttributesToUpdate.flatMap(
        attr => {
          const uniqueAttributeWriteItems: DynamoDB.DocumentClient.TransactWriteItemList = [
            {
              Put: {
                TableName: table.name,
                Item: {
                  ...this.getParsedPrimaryKey(
                    table,
                    attr.unique,
                    newBody as Partial<Entity>
                  ),
                },
                ...uniqueRecordConditionExpression,
              },
            },
          ];

          // if unique attribute previously existed, remove it as part of the same transaction
          if (previousItemBody && previousItemBody[attr.name]) {
            uniqueAttributeWriteItems.push({
              Delete: {
                TableName: table.name,
                Key: {
                  ...this.getParsedPrimaryKey(
                    table,
                    attr.unique,
                    previousItemBody
                  ),
                },
              },
            });
          }

          return uniqueAttributeWriteItems;
        }
      );

      // in order for update express to succeed, all listed must succeed in a transaction
      const updateTransactionItems = [
        {Update: mainItem},
        ...uniqueAttributeInputs,
      ] as DynamoDB.DocumentClient.TransactWriteItem[];
      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.UPDATE,
        prefix: 'After',
        entityName,
        primaryKey: null,
        body: updateTransactionItems,
      });
      return updateTransactionItems;
    };
  }

  /**
   * lazily resolve all unique attribute items to remove
   * @param table
   * @param uniqueAttributesToRemove
   * @param mainItem
   */
  private lazyToDynamoRemoveItemFactory(
    table: Table,
    entityName: string,
    uniqueAttributesToRemove: Replace<
      AttributeMetadata,
      'unique',
      {
        unique: DynamoEntitySchemaPrimaryKey;
      }
    >[],
    mainItem: DynamoDB.DocumentClient.DeleteItemInput,
    metadataOptions?: MetadataOptions
  ) {
    return (existingItemBody: any) => {
      let uniqueAttributeInputs: DynamoDB.DocumentClient.TransactWriteItemList = [];
      if (existingItemBody) {
        uniqueAttributeInputs = uniqueAttributesToRemove.map(attr => {
          return {
            Delete: {
              TableName: table.name,
              Key: {
                ...this.getParsedPrimaryKey(
                  table,
                  attr.unique,
                  existingItemBody
                ),
              },
            },
          };
        });
      }

      const deleteTransactionItems = [
        {
          Delete: mainItem,
        },
        ...uniqueAttributeInputs,
      ] as DynamoDB.DocumentClient.TransactWriteItem[];

      this.connection.logger.logTransform({
        requestId: metadataOptions?.requestId,
        operation: TRANSFORM_TYPE.DELETE,
        prefix: 'After',
        entityName,
        primaryKey: null,
        body: deleteTransactionItems,
      });

      return deleteTransactionItems;
    };
  }
}
