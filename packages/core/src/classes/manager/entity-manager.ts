import {DynamoDB} from 'aws-sdk';
import {
  EntityAttributes,
  EntityTarget,
  PrimaryKeyAttributes,
  UpdateAttributes,
} from '@typedorm/common';
import {getDynamoQueryItemsLimit} from '../../helpers/get-dynamo-query-items-limit';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {Connection} from '../connection/connection';
import {WriteTransaction} from '../transaction/write-transaction';
import {
  DocumentClientRequestTransformer,
  ManagerToDynamoQueryItemsOptions,
} from '../transformer/document-client-request-transformer';
import {EntityTransformer} from '../transformer/entity-transformer';
import {getConstructorForInstance} from '../../helpers/get-constructor-for-instance';
import {isUsedForPrimaryKey} from '../../helpers/is-used-for-primary-key';
import {isWriteTransactionItemList} from '../transaction/type-guards';
import {isLazyTransactionWriteItemListLoader} from '../transformer/is-lazy-transaction-write-item-list-loder';

export interface EntityManagerUpdateOptions {
  /**
   * @default '.'
   */
  nestedKeySeparator?: string;
}

export interface EntityManagerQueryOptions
  extends ManagerToDynamoQueryItemsOptions {
  cursor?: DynamoDB.DocumentClient.Key;
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
  async create<Entity>(entity: Entity): Promise<Entity> {
    const dynamoPutItemInput = this._dcReqTransformer.toDynamoPutItem(entity);
    const entityClass = getConstructorForInstance(entity);

    if (!isWriteTransactionItemList(dynamoPutItemInput)) {
      await this.connection.documentClient.put(dynamoPutItemInput).promise();

      // by default dynamodb does not return attributes on create operation, so return one
      const itemToReturn = this._entityTransformer.fromDynamoEntity<Entity>(
        entityClass,
        dynamoPutItemInput.Item
      );

      return itemToReturn;
    }

    // dynamoPutItemInput is a transact item list, meaning that it contains one or more unique attributes, which also
    // needs to be created along with original item

    const transaction = new WriteTransaction(
      this.connection,
      dynamoPutItemInput
    );
    await this.connection.transactionManger.write(transaction);

    const itemToReturn = this._entityTransformer.fromDynamoEntity<Entity>(
      entityClass,
      // if create operation contains multiple items, first one will the original item
      dynamoPutItemInput[0]?.Put?.Item ?? {}
    );

    return itemToReturn;
  }

  /**
   * Finds an record by given primary key, when table uses composite primary key,
   * props must include both partition and sort key attributes
   * @param entityClass Entity to get value of
   * @param props attributes of entity
   */
  async findOne<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKey
  ): Promise<Entity | undefined> {
    const dynamoGetItem = this._dcReqTransformer.toDynamoGetItem(
      entityClass,
      primaryKeyAttributes
    );

    const response = await this.connection.documentClient
      .get(dynamoGetItem)
      .promise();

    const entity = this._entityTransformer.fromDynamoEntity<Entity>(
      entityClass,
      response.Item ?? {}
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
    attributes: KeyAttributes
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
      return !!(await this.findOne(entityClass, attributes));
    }

    // try finding entity by unique attribute
    if (!isEmptyObject(uniqueAttributes)) {
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

      return !!(
        await this.connection.documentClient
          .get({
            Key: {...parsedPrimaryKey},
            TableName: metadata.table.name,
          })
          .promise()
      ).Item;
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
  async update<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKeyAttributes<PrimaryKey, any>,
    body: UpdateAttributes<PrimaryKey, Entity>,
    options?: EntityManagerUpdateOptions
  ): Promise<Entity> {
    const dynamoUpdateItem = this._dcReqTransformer.toDynamoUpdateItem<
      PrimaryKey,
      Entity
    >(entityClass, primaryKeyAttributes, body, options);

    if (!isLazyTransactionWriteItemListLoader(dynamoUpdateItem)) {
      const response = await this.connection.documentClient
        .update(dynamoUpdateItem)
        .promise();

      return this._entityTransformer.fromDynamoEntity<Entity>(
        entityClass,
        // return all new attributes
        response.Attributes ?? {}
      );
    }

    // first get existing item, so that we can safely clear previous unique attributes
    const existingItem = await this.findOne<PrimaryKey, Entity>(
      entityClass,
      primaryKeyAttributes
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

    const transaction = new WriteTransaction(this.connection, updateItemList);
    // since write transaction does not return any, we will need to get the latest one from dynamo
    await this.connection.transactionManger.write(transaction);
    const updatedItem = (await this.findOne<PrimaryKey, Entity>(
      entityClass,
      primaryKeyAttributes
    )) as Entity;

    return updatedItem;
  }

  /**
   * Deletes an entity by primary key
   * @param entityClass Entity Class to delete
   * @param primaryKeyAttributes Entity Primary key
   */
  async delete<PrimaryKeyAttributes, Entity>(
    entityClass: EntityTarget<Entity>,
    primaryKeyAttributes: PrimaryKeyAttributes
  ) {
    const dynamoDeleteItem = this._dcReqTransformer.toDynamoDeleteItem<
      PrimaryKeyAttributes,
      Entity
    >(entityClass, primaryKeyAttributes);

    if (!isLazyTransactionWriteItemListLoader(dynamoDeleteItem)) {
      await this.connection.documentClient.delete(dynamoDeleteItem).promise();
      return {
        success: true,
      };
    }

    // first get existing item, so that we can safely clear previous unique attributes
    const existingItem = await this.findOne<PrimaryKeyAttributes, Entity>(
      entityClass,
      primaryKeyAttributes
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
    const transaction = new WriteTransaction(this.connection, deleteItemList);
    // delete main item and all it's unique attributes as part of single transaction
    await this.connection.transactionManger.write(transaction);
    return {
      success: true,
    };
  }

  /**
   * Find items items using declarative query options
   * @param entityClass Entity to query
   * @param partitionKeyAttributes Partition key attributes, If querying an index,
   * this is the partition key attributes of that index
   * @param queryOptions Query Options
   */
  async find<
    Entity,
    PartitionKeyAttributes = Partial<EntityAttributes<Entity>>
  >(
    entityClass: EntityTarget<Entity>,
    partitionKeyAttributes: PartitionKeyAttributes & {
      queryIndex?: string;
    },
    queryOptions?: EntityManagerQueryOptions
  ) {
    const dynamoQueryItem = this._dcReqTransformer.toDynamoQueryItem<
      PartitionKeyAttributes,
      Entity
    >(entityClass, partitionKeyAttributes, queryOptions);

    const response = await this._internalRecursiveQuery({
      queryInput: dynamoQueryItem,
      // if no explicit limit is set, always fall back to imposing implicit limit
      limit: queryOptions?.limit ?? getDynamoQueryItemsLimit(),
      cursor: queryOptions?.cursor,
    });

    return {
      ...response,
      items: response.items.map(item =>
        this._entityTransformer.fromDynamoEntity<Entity>(entityClass, item)
      ),
    };
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
  }: {
    queryInput: DynamoDB.DocumentClient.QueryInput;
    limit: number;
    cursor?: DynamoDB.DocumentClient.Key;
    itemsFetched?: DynamoDB.DocumentClient.ItemList;
  }): Promise<{
    items: DynamoDB.DocumentClient.ItemList;
    cursor?: DynamoDB.DocumentClient.Key;
  }> {
    const {
      LastEvaluatedKey,
      Items = [],
    } = await this.connection.documentClient
      .query({...queryInput, ExclusiveStartKey: cursor})
      .promise();
    itemsFetched = [...itemsFetched, ...Items];

    if (itemsFetched.length < limit && LastEvaluatedKey) {
      return this._internalRecursiveQuery({
        queryInput,
        limit,
        cursor: LastEvaluatedKey,
        itemsFetched,
      });
    }
    return {items: itemsFetched, cursor: LastEvaluatedKey};
  }
}
