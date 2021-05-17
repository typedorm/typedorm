import {DynamoEntity, EntityTarget, TRANSFORM_TYPE} from '@typedorm/common';
import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {unParseKey} from '../../helpers/unparse-key';
import {Connection} from '../connection/connection';
import {BaseTransformer} from './base-transformer';

/**
 * Note: To use any of the base transformer methods, this default entity transformer should be used
 */
export class EntityTransformer extends BaseTransformer {
  constructor(connection: Connection) {
    super(connection);
  }
  /**
   * Converts dynamodb entity to model defined in entities
   * @param entityClass - Target class to look metadata off
   * @param dynamoEntity
   */
  fromDynamoEntity<Entity>(
    entityClass: EntityTarget<Entity>,
    dynamoEntity: DynamoEntity<Entity>
  ): Entity {
    const entityMetadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform({
      operation: TRANSFORM_TYPE.RESPONSE,
      prefix: 'Before',
      entityName: entityMetadata.name,
      primaryKey: null,
      body: dynamoEntity,
    });

    const entityPrimaryKeys = Object.keys(
      entityMetadata.schema.primaryKey.attributes
    );
    const entityInternalAttributeKeys = entityMetadata.internalAttributes.map(
      attr => attr.name
    );

    const entityHiddenAttributeKeys = entityMetadata.attributes
      .filter(attr => attr.hidden)
      .map(attr => attr.name);

    const entityMetadataSchemaIndexes = entityMetadata.schema.indexes ?? {};
    const entityIndexes = Object.keys(entityMetadataSchemaIndexes)
      .map(key => {
        return Object.keys(entityMetadataSchemaIndexes[key].attributes ?? {});
      })
      .flat();

    const transformedEntity = Object.keys(dynamoEntity).reduce((acc, key) => {
      // if any of the below conditions are true, skip adding given attribute from returning response
      if (
        entityPrimaryKeys.includes(key) ||
        entityIndexes.includes(key) ||
        entityInternalAttributeKeys.includes(key) ||
        entityHiddenAttributeKeys.includes(key)
      ) {
        return acc;
      }
      (acc as any)[key] = (dynamoEntity as any)[key];
      return acc;
    }, {} as Entity);

    this.connection.logger.logTransform({
      operation: TRANSFORM_TYPE.RESPONSE,
      prefix: 'After',
      entityName: entityMetadata.name,
      primaryKey: null,
      body: transformedEntity,
    });

    return transformedEntity;
  }

  fromDynamoKeyToAttributes<Entity>(
    entityClass: EntityTarget<Entity>,
    dynamoKey: DocumentClient.Key
  ) {
    const entityMetadata = this.connection.getEntityByTarget(entityClass);
    const primaryKeyAttributes = entityMetadata.schema.primaryKey.attributes;
    const interpolations =
      entityMetadata.schema.primaryKey?.metadata?._interpolations ?? {};

    const rawAttributes = Object.entries(primaryKeyAttributes).reduce(
      (acc, [keyName, keyPattern]) => {
        const unParsed = unParseKey(
          keyPattern,
          dynamoKey[keyName],
          interpolations[keyName] ?? []
        );
        acc = {...acc, ...unParsed};
        return acc;
      },
      {}
    );

    // like compare actual key with the schema and pull out variable name an it's values
    // then return those as key value pair

    const attributes = Object.entries(rawAttributes).reduce(
      (acc, [attrName, value]: [string, any]) => {
        const attrMetadata = entityMetadata.attributes.find(
          attr => attr.name === attrName
        );

        if (!attrMetadata) {
          throw new Error(
            `Failed to reverse transform attribute ${attrName}, it was referenced in schema but it is not known to entity ${entityClass.name}`
          );
        }

        if (
          (attrMetadata.type === 'Boolean' || attrMetadata.type === 'Number') &&
          value
        ) {
          acc[attrName] = JSON.parse(value);
        } else {
          acc[attrName] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );
    return attributes;
  }
}
