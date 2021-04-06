import {
  EntityTarget,
  IndexOptions,
  INDEX_TYPE,
  PrimaryKeyAttributes,
  QUERY_ORDER,
  Replace,
  RETURN_VALUES,
  Table,
  UpdateAttributes,
  TRANSFORM_TYPE,
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
import {BaseTransformer} from './base-transformer';
import {LazyTransactionWriteItemListLoader} from './is-lazy-transaction-write-item-list-loader';
import {
  ExpressionInputParser,
  KeyConditionOptions,
} from '../expression/expression-input-parser';

export interface TransformerToDynamoQueryItemsOptions {
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
}

export interface TransformerToDynamoUpdateItemsOptions {
  /**
   * key separator
   * @default '.''
   */
  nestedKeySeparator?: string;

  where?: any;
}

export interface ManagerToDynamoPutItemOptions {
  /**
   * @default false
   */
  overwriteIfExists: boolean;
}

export class DocumentClientRequestTransformer extends BaseTransformer {
  private _expressionBuilder: ExpressionBuilder;
  private _expressionInputParser: ExpressionInputParser;

  constructor(connection: Connection) {
    super(connection);
    this._expressionBuilder = new ExpressionBuilder();
    this._expressionInputParser = new ExpressionInputParser();
  }

  toDynamoGetItem<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKey: PrimaryKey
  ): DynamoDB.DocumentClient.GetItemInput {
    const metadata = this.connection.getEntityByTarget(entityClass);

    this.connection.logger.logTransform(
      TRANSFORM_TYPE.GET,
      'Before',
      metadata.name,
      primaryKey
    );

    const tableName = this.getTableNameForEntity(entityClass);

    const parsedPrimaryKey = this.getParsedPrimaryKey(
      metadata.table,
      metadata.schema.primaryKey,
      primaryKey
    );

    if (isEmptyObject(parsedPrimaryKey)) {
      throw new Error('Primary could not be resolved');
    }

    const transformBody = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
    };
    this.connection.logger.logTransform(
      TRANSFORM_TYPE.GET,
      'After',
      metadata.name,
      null,
      transformBody
    );
    return transformBody;
  }

  toDynamoPutItem<Entity>(
    entity: Entity,
    options?: ManagerToDynamoPutItemOptions
  ):
    | DynamoDB.DocumentClient.PutItemInput
    | DynamoDB.DocumentClient.TransactWriteItemList {
    const entityClass = getConstructorForInstance(entity);
    const {
      table,
      internalAttributes,
      name,
      attributes,
    } = this.connection.getEntityByTarget(entityClass);

    this.connection.logger.logTransform(
      TRANSFORM_TYPE.PUT,
      'Before',
      name,
      null,
      entity,
      options
    );

    const uniqueAttributes = this.connection.getUniqueAttributesForEntity(
      entityClass
    ) as AttributeMetadata[];

    const dynamoEntity = this.toDynamoEntity(entity);

    const entityInternalAttributes = internalAttributes.reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as DynamoDB.DocumentClient.PutItemInputAttributeMap);

    const attributesWithDefaultValues = attributes
      .filter(
        attr =>
          !!(
            (attr as AttributeMetadata)?.default &&
            typeof (attr as AttributeMetadata)?.default === 'function'
          )
      )
      .reduce((acc, attr) => {
        const defaultValueProvider: any = (attr as AttributeMetadata).default;
        acc[attr.name] = defaultValueProvider(dynamoEntity);
        return acc;
      }, {} as DynamoDB.DocumentClient.PutItemInputAttributeMap);

    let dynamoPutItem = {
      Item: {
        ...entityInternalAttributes,
        ...attributesWithDefaultValues,
        ...dynamoEntity,
      },
      TableName: table.name,
    } as DynamoDB.DocumentClient.PutItemInput;

    // apply attribute not exist condition when creating unique
    const uniqueRecordConditionExpression = new ExpressionBuilder().buildUniqueRecordConditionExpression(
      table
    );

    // always prevent overwriting data until explicitly told to do otherwise
    if (!options?.overwriteIfExists) {
      dynamoPutItem = {
        ...dynamoPutItem,
        ...uniqueRecordConditionExpression,
      };
    }

    if (!uniqueAttributes.length) {
      this.connection.logger.logTransform(
        TRANSFORM_TYPE.PUT,
        'After',
        name,
        null,
        dynamoPutItem
      );
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

    this.connection.logger.logTransform(
      TRANSFORM_TYPE.PUT,
      'After',
      name,
      null,
      uniqueAttributesPutItems
    );

    return uniqueAttributesPutItems;
  }

  toDynamoUpdateItem<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKeyAttributes<PrimaryKey, any>,
    body: UpdateAttributes<PrimaryKey, Entity>,
    options: TransformerToDynamoUpdateItemsOptions = {}
  ):
    | DynamoDB.DocumentClient.UpdateItemInput
    | LazyTransactionWriteItemListLoader {
    // default values
    const {nestedKeySeparator = '.'} = options;

    if (!this.connection.hasMetadata(entityClass)) {
      throw new Error(`No metadata found for class "${entityClass.name}".`);
    }

    const metadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform(
      TRANSFORM_TYPE.UPDATE,
      'Before',
      metadata.name,
      primaryKeyAttributes,
      body,
      options
    );
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

    const attributesToUpdate = {...body, ...formattedAutoUpdateAttributes};

    // get all affected indexes for attributes
    const affectedIndexes = this.getAffectedIndexesForAttributes<
      PrimaryKey,
      Entity
    >(entityClass, attributesToUpdate, {
      nestedKeySeparator,
    });

    const {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } = this._expressionBuilder.buildUpdateExpression({
      ...attributesToUpdate,
      ...affectedIndexes,
    });

    const uniqueAttributesToUpdate = this.connection
      .getUniqueAttributesForEntity(entityClass)
      .filter(attr => !!body[attr.name]);

    const itemToUpdate: DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
      UpdateExpression,
      // request all new attributes
      ReturnValues: RETURN_VALUES.ALL_NEW,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };

    // if 'where' was provided, build condition expression
    if (options.where && !isEmptyObject(options.where)) {
      const condition = this._expressionInputParser.parseToCondition(
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
      } = this._expressionBuilder.buildConditionExpression(condition);

      // append condition expression if one was built
      itemToUpdate.ConditionExpression = ConditionExpression;
      itemToUpdate.ExpressionAttributeNames = {
        ...itemToUpdate.ExpressionAttributeNames,
        ...ExpressionAttributeNames,
      };
      itemToUpdate.ExpressionAttributeValues = {
        ...itemToUpdate.ExpressionAttributeValues,
        ...ExpressionAttributeValues,
      };
    }

    // when item does not have any unique attributes to update, return putItemInput
    if (!uniqueAttributesToUpdate.length) {
      this.connection.logger.logTransform(
        TRANSFORM_TYPE.UPDATE,
        'After',
        metadata.name,
        null,
        itemToUpdate
      );
      return itemToUpdate;
    }

    // if there are unique attributes, return a lazy loader, which will return write item list
    const lazyLoadTransactionWriteItems = this.lazyToDynamoUpdateItemFactory<
      PrimaryKey,
      Entity
    >(
      metadata.table,
      metadata.name,
      uniqueAttributesToUpdate,
      dropProp(itemToUpdate, 'ReturnValues'),
      body
    );

    return {
      primaryKeyAttributes,
      entityClass,
      lazyLoadTransactionWriteItems,
    };
  }

  toDynamoDeleteItem<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKey: PrimaryKey
  ):
    | DynamoDB.DocumentClient.DeleteItemInput
    | LazyTransactionWriteItemListLoader {
    const metadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform(
      TRANSFORM_TYPE.DELETE,
      'Before',
      metadata.name,
      primaryKey
    );
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

    const mainItemToRemove = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
    };
    // if item does not have any unique attributes return it as is
    if (!uniqueAttributesToRemove?.length) {
      this.connection.logger.logTransform(
        TRANSFORM_TYPE.DELETE,
        'After',
        metadata.name,
        primaryKey
      );
      return mainItemToRemove;
    }

    // or return lazy resolver
    const lazyLoadTransactionWriteItems = this.lazyToDynamoRemoveItemFactory(
      metadata.table,
      metadata.name,
      uniqueAttributesToRemove,
      mainItemToRemove
    );

    return {
      primaryKeyAttributes: primaryKey,
      entityClass,
      lazyLoadTransactionWriteItems,
    };
  }

  toDynamoQueryItem<PartitionKeyAttributes, Entity>(
    entityClass: EntityTarget<Entity>,
    partitionKeyAttributes: PartitionKeyAttributes | string,
    queryOptions?: TransformerToDynamoQueryItemsOptions
  ): DynamoDB.DocumentClient.QueryInput {
    const {table, schema, name} = this.connection.getEntityByTarget(
      entityClass
    );
    this.connection.logger.logTransform(
      TRANSFORM_TYPE.QUERY,
      'Before',
      name,
      partitionKeyAttributes,
      queryOptions
    );
    const queryIndexName = queryOptions?.queryIndex;
    let indexToQuery: IndexOptions | undefined;
    if (queryIndexName) {
      const matchingIndex = table.getIndexByKey(queryIndexName);
      if (!matchingIndex) {
        throw new Error(
          `Requested to query items from index "${queryIndexName}", but no such index exists on table "${table.name}".`
        );
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

    const partitionKeyConditionExpression = this._expressionBuilder.buildKeyConditionExpression(
      partitionKeyCondition
    );

    // if no query options are present, resolve key condition expression
    if (!queryOptions || isEmptyObject(queryOptions)) {
      const transformedQueryItem = {
        TableName: table.name,
        IndexName: queryIndexName,
        ...partitionKeyConditionExpression,
      };

      this.connection.logger.logTransform(
        TRANSFORM_TYPE.QUERY,
        'After',
        name,
        null,
        transformedQueryItem
      );

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
    const {keyCondition, limit, orderBy: order, where} = queryOptions;

    let queryInputParams = {
      TableName: table.name,
      IndexName: queryIndexName,
      Limit: limit,
      ScanIndexForward: !order || order === QUERY_ORDER.ASC,
      ...partitionKeyConditionExpression,
    } as DynamoDB.DocumentClient.QueryInput;

    if (keyCondition && !isEmptyObject(keyCondition)) {
      // build sort key condition

      const sortKeyCondition = this._expressionInputParser.parseToKeyCondition(
        parsedSortKey.name,
        keyCondition
      );

      // if condition resolution was successful, we can merge both partition and sort key conditions now
      const {
        KeyConditionExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = this._expressionBuilder.buildKeyConditionExpression(
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
      const filter = this._expressionInputParser.parseToFilter(where);

      if (!filter) {
        throw new Error(
          `Failed to build filter expression for input: ${JSON.stringify(
            where
          )}`
        );
      }

      const {
        FilterExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = this._expressionBuilder.buildFilterExpression(filter);

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

    this.connection.logger.logTransform(
      TRANSFORM_TYPE.QUERY,
      'After',
      name,
      null,
      queryInputParams
    );

    return queryInputParams;
  }

  /**
   * Lazy build update item input
   * This is helpful in cases where we don't you have all the attributes to build item input, and the caller will need to
   * to perform some sort of async call in order to fetch attributes and proceed with build
   *
   */
  private lazyToDynamoUpdateItemFactory<PrimaryKey, Entity>(
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
    newBody: UpdateAttributes<PrimaryKey, Entity>
  ) {
    // returns transact write item list
    return (previousItemBody: any) => {
      // updating unique attributes also require checking if new value exists
      const uniqueRecordConditionExpression = new ExpressionBuilder().buildUniqueRecordConditionExpression(
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
                  ...this.getParsedPrimaryKey(table, attr.unique, newBody),
                },
                ...uniqueRecordConditionExpression,
              },
            },
          ];

          // if unique attribute previously existed, remove it as part of the same transaction
          if (previousItemBody[attr.name]) {
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
      this.connection.logger.logTransform(
        TRANSFORM_TYPE.UPDATE,
        'After',
        entityName,
        null,
        updateTransactionItems
      );
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
    mainItem: DynamoDB.DocumentClient.DeleteItemInput
  ) {
    return (existingItemBody: any) => {
      const uniqueAttributeInputs: DynamoDB.DocumentClient.TransactWriteItemList = uniqueAttributesToRemove.map(
        attr => {
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
        }
      );

      const deleteTransactionItems = [
        {
          Delete: mainItem,
        },
        ...uniqueAttributeInputs,
      ] as DynamoDB.DocumentClient.TransactWriteItem[];

      this.connection.logger.logTransform(
        TRANSFORM_TYPE.DELETE,
        'After',
        entityName,
        null,
        deleteTransactionItems
      );

      return deleteTransactionItems;
    };
  }
}
