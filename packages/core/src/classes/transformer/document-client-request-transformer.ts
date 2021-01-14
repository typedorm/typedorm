import {
  EntityTarget,
  FindKeyListOperator,
  FindKeyScalarOperator,
  FindKeySimpleOperator,
  IndexOptions,
  INDEX_TYPE,
  PrimaryKeyAttributes,
  QUERY_ORDER,
  RequireOnlyOne,
  RETURN_VALUES,
  ScalarType,
  UpdateAttributes,
} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {getConstructorForInstance} from '../../helpers/get-constructor-for-instance';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {parseKey} from '../../helpers/parse-key';
import {KeyCondition} from '../condition/key-condition';
import {Connection} from '../connection/connection';
import {ExpressionBuilder} from '../expression-builder';
import {EntityManagerUpdateOptions} from '../manager/entity-manager';
import {AttributeMetadata} from '../metadata/attribute-metadata';
import {BaseTransformer} from './base-transformer';

export interface ManagerToDynamoQueryItemsOptions {
  /**
   * Sort key condition
   * @default none - no sort key condition is applied
   */
  keyCondition?: RequireOnlyOne<
    {
      [key in FindKeyScalarOperator]: ScalarType;
    } &
      {
        [key in FindKeyListOperator]: [ScalarType, ScalarType];
      }
  >;

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
}

export interface ManagerToDynamoPutItemOptions {
  /**
   * @default false
   */
  overwriteIfExists: boolean;
}

export class DocumentClientRequestTransformer extends BaseTransformer {
  private _expressionBuilder: ExpressionBuilder;

  constructor(connection: Connection) {
    super(connection);
    this._expressionBuilder = new ExpressionBuilder();
  }

  toDynamoGetItem<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKey: PrimaryKey
  ): DynamoDB.DocumentClient.GetItemInput {
    const metadata = this.connection.getEntityByTarget(entityClass);

    const tableName = this.getTableNameForEntity(entityClass);

    const parsedPrimaryKey = this.getParsedPrimaryKey(
      metadata.table,
      metadata.schema.primaryKey,
      primaryKey
    );

    if (isEmptyObject(parsedPrimaryKey)) {
      throw new Error('Primary could not be resolved');
    }

    return {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
    };
  }

  toDynamoPutItem<Entity>(
    entity: Entity,
    options?: ManagerToDynamoPutItemOptions
  ):
    | DynamoDB.DocumentClient.PutItemInput
    | DynamoDB.DocumentClient.TransactWriteItemList {
    const entityClass = getConstructorForInstance(entity);
    const {table, internalAttributes} = this.connection.getEntityByTarget(
      entityClass
    );

    const uniqueAttributes = this.connection.getUniqueAttributesForEntity(
      entityClass
    ) as AttributeMetadata[];

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

    return [{Put: dynamoPutItem}, ...uniqueAttributePutItems];
  }

  toDynamoUpdateItem<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKeyAttributes<PrimaryKey, any>,
    body: UpdateAttributes<PrimaryKey, Entity>,
    previousUniqueAttributes: UpdateAttributes<PrimaryKey, Entity> = {},
    options: EntityManagerUpdateOptions = {}
  ):
    | DynamoDB.DocumentClient.UpdateItemInput
    | DynamoDB.DocumentClient.TransactWriteItemList {
    // default values
    const {nestedKeySeparator = '.'} = options;

    if (!this.connection.hasMetadata(entityClass)) {
      throw new Error(`No metadata found for class "${entityClass.name}".`);
    }

    const metadata = this.connection.getEntityByTarget(entityClass);

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

    const itemToUpdate = {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      // get all the updated attributes, these will later be used to remove previous unique items
      ReturnValues: RETURN_VALUES.ALL_NEW,
    };

    // when item does not have any unique attributes to update, return putItemInput
    if (!uniqueAttributesToUpdate.length) {
      return itemToUpdate;
    }

    // updating unique attributes also require checking if new value exists
    const uniqueRecordConditionExpression = new ExpressionBuilder().buildUniqueRecordConditionExpression(
      metadata.table
    );

    // map all unique attributes to [put, delete] item tuple
    const uniqueAttributeInputs: DynamoDB.DocumentClient.TransactWriteItemList = uniqueAttributesToUpdate.flatMap(
      attr => {
        // when updating unique attributes, their old values must exist in "previousUniqueAttributes"
        if (!previousUniqueAttributes[attr.name]) {
          throw new Error(
            `Failed to find resolve previous value for unique attribute "${attr.name}", when updating unique attributes their old value must be provided in "previousUniqueAttributes".`
          );
        }

        return [
          // create record with new value
          {
            Put: {
              TableName: metadata.table.name,
              Item: {
                ...this.getParsedPrimaryKey(metadata.table, attr.unique, body),
              },
              ...uniqueRecordConditionExpression,
            },
          },
          // delete earlier record
          {
            Delete: {
              TableName: metadata.table.name,
              Item: {
                ...this.getParsedPrimaryKey(
                  metadata.table,
                  attr.unique,
                  previousUniqueAttributes
                ),
              },
            },
          },
        ] as DynamoDB.DocumentClient.TransactWriteItemList;
      }
    );

    // in order for update express to succeed, all listed must succeed in a transaction
    return [{Update: itemToUpdate}, ...uniqueAttributeInputs];
  }

  toDynamoDeleteItem<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKey: PrimaryKey
  ): DynamoDB.DocumentClient.DeleteItemInput {
    const metadata = this.connection.getEntityByTarget(entityClass);

    const tableName = metadata.table.name;

    const parsedPrimaryKey = this.getParsedPrimaryKey(
      metadata.table,
      metadata.schema.primaryKey,
      primaryKey
    );

    if (isEmptyObject(parsedPrimaryKey)) {
      throw new Error('Primary could not be resolved');
    }

    return {
      TableName: tableName,
      Key: {
        ...parsedPrimaryKey,
      },
    };
  }

  toDynamoQueryItem<PartitionKeyAttributes, Entity>(
    entityClass: EntityTarget<Entity>,
    partitionKeyAttributes: PartitionKeyAttributes & {
      queryIndex?: string;
    },
    queryOptions?: ManagerToDynamoQueryItemsOptions
  ): DynamoDB.DocumentClient.QueryInput {
    const {table, schema} = this.connection.getEntityByTarget(entityClass);

    const queryIndexName = partitionKeyAttributes.queryIndex ?? '';
    let indexToQuery: IndexOptions | undefined;
    if (partitionKeyAttributes.queryIndex) {
      const matchingIndex = table.getIndexByKey(
        partitionKeyAttributes.queryIndex
      );
      if (!matchingIndex) {
        throw new Error(
          `Requested to query items from index "${partitionKeyAttributes.queryIndex}", but no such index exists on table "${table.name}".`
        );
      }

      const matchingIndexOnEntity =
        schema.indexes && schema.indexes[partitionKeyAttributes.queryIndex];

      if (!matchingIndexOnEntity) {
        throw new Error(
          `Requested to query items from index "${partitionKeyAttributes.queryIndex}", but no such index exists on entity.`
        );
      }
      indexToQuery = matchingIndex;
    }

    const parsedPartitionKey = {} as {name: string; value: any};
    // query will be executed against main table or
    // if querying local  index, then partition key will be same as main table
    if (
      !queryIndexName ||
      !indexToQuery ||
      indexToQuery?.type === INDEX_TYPE.LSI
    ) {
      parsedPartitionKey.name = table.partitionKey;
      parsedPartitionKey.value = parseKey(
        schema.primaryKey[table.partitionKey],
        partitionKeyAttributes
      );
    } else {
      // query is to be executed against global secondary index
      parsedPartitionKey.name = indexToQuery.partitionKey;

      const schemaForIndexToQuery = (schema.indexes ?? {})[queryIndexName];
      parsedPartitionKey.value = parseKey(
        schemaForIndexToQuery[indexToQuery.partitionKey],
        partitionKeyAttributes
      );
    }
    const partitionKeyCondition = new KeyCondition().equals(
      parsedPartitionKey.name,
      parsedPartitionKey.value
    );

    // if no query options are present, resolve key condition expression
    if (!queryOptions || isEmptyObject(queryOptions)) {
      return {
        TableName: table.name,
        IndexName: partitionKeyAttributes.queryIndex,
        ...this._expressionBuilder.buildKeyConditionExpression(
          partitionKeyCondition
        ),
      };
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
    const {keyCondition, limit, orderBy: order} = queryOptions;

    let queryInputParams = {
      TableName: table.name,
      IndexName: partitionKeyAttributes.queryIndex,
      Limit: limit,
      ScanIndexForward: !order || order === QUERY_ORDER.ASC,
    } as DynamoDB.DocumentClient.QueryInput;

    if (keyCondition && !isEmptyObject(keyCondition)) {
      // build sort key condition
      const sortKeyCondition = new KeyCondition();
      if (keyCondition.BETWEEN && keyCondition.BETWEEN.length) {
        sortKeyCondition.between(parsedSortKey.name, keyCondition.BETWEEN);
      } else if (keyCondition.BEGINS_WITH) {
        sortKeyCondition.beginsWith(
          parsedSortKey.name,
          keyCondition.BEGINS_WITH
        );
      } else {
        const operator = Object.keys(keyCondition)[0] as FindKeySimpleOperator;
        sortKeyCondition.addBaseOperatorCondition(
          operator,
          parsedSortKey.name,
          keyCondition[operator]
        );
      }

      // if condition resolution was successful, we can merge both partition and sort key conditions now
      const keyConditionExpression = this._expressionBuilder.buildKeyConditionExpression(
        partitionKeyCondition.merge(sortKeyCondition)
      );

      queryInputParams = {
        ...queryInputParams,
        ...keyConditionExpression,
      };
    }

    return {
      ...queryInputParams,
    };
  }
}
