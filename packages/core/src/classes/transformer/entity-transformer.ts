import {DynamoEntity, EntityTarget, TRANSFORM_TYPE} from '@typedorm/common';
import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {plainToClassFromExist} from 'class-transformer';
import {unParseKey} from '../../helpers/unparse-key';
import {Connection} from '../connection/connection';
import {BaseTransformer, MetadataOptions} from './base-transformer';

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
    dynamoEntity: DynamoEntity<Entity>,
    metadataOptions?: Pick<MetadataOptions, 'requestId'>
  ): Entity {
    const entityMetadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
      operation: TRANSFORM_TYPE.RESPONSE,
      prefix: 'Before',
      entityName: entityMetadata.name,
      primaryKey: null,
      body: dynamoEntity,
    });

    const vanillaAttributesToInclude = entityMetadata.attributes
      .filter(attr => !attr.hidden)
      .map(attr => attr.name);

    const primaryKeyAttributesToInclude = Object.keys(
      entityMetadata.schema.primaryKey.attributes
    ).filter(attr => !vanillaAttributesToInclude.includes(attr));

    const entityInternalAttributeKeys = entityMetadata.internalAttributes.map(
      attr => attr.name
    );
    const entityHiddenAttributeKeys = entityMetadata.attributes
      .filter(attr => attr.hidden)
      .map(attr => attr.name);

    const entityMetadataSchemaIndexes = entityMetadata.schema.indexes ?? {};
    const indexAttributesToInclude = Object.keys(entityMetadataSchemaIndexes)
      .map(key => {
        return Object.keys(entityMetadataSchemaIndexes[key].attributes ?? {});
      })
      .flat()
      .filter(attr => !vanillaAttributesToInclude.includes(attr));

    const plainEntityAttributes = Object.keys(dynamoEntity).reduce(
      (acc, key) => {
        // if any of the below conditions are true, skip adding given attribute from returning response
        if (
          primaryKeyAttributesToInclude.includes(key) ||
          indexAttributesToInclude.includes(key) ||
          entityInternalAttributeKeys.includes(key) ||
          entityHiddenAttributeKeys.includes(key)
        ) {
          return acc;
        }
        (acc as any)[key] = (dynamoEntity as any)[key];
        return acc;
      },
      {} as Object
    );

    // get reflected constructor to avoid initialization issues with custom constructor
    const reflectedConstructor = Reflect.construct(Object, [], entityClass);

    // Perform a deep-copy of item returned by Document client to drop all the custom function types

    // Custom types are emitted by the document client in cases where dynamodb item was created outside the js ecosystem.
    // To correctly deserialize the returned values to the relevant Entity, it needs to be in a plain JSON structure.
    // i.e DynamoDB itself supports `StringSet` type but since js doesn't have a `StringSet` as a native type,
    // Therefore, DocumentClient wraps it as a custom `Set` type which must be turned into its JSON form before it can
    // be correctly deserialized by `class-transformer`.

    const deserializedEntityAttributes = JSON.parse(
      JSON.stringify(plainEntityAttributes)
    );

    const transformedEntity = plainToClassFromExist(
      reflectedConstructor,
      deserializedEntityAttributes
    );

    this.connection.logger.logTransform({
      requestId: metadataOptions?.requestId,
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
