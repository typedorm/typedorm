import {DynamoEntity, EntityTarget, TRANSFORM_TYPE} from '@typedorm/common';
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
   * @param entityClass - Target class to look metadata off
   * @param dynamoEntity
   */
  fromDynamoEntity<Entity>(
    entityClass: EntityTarget<Entity>,
    dynamoEntity: DynamoEntity<Entity>
  ): Entity {
    const entityMetadata = this.connection.getEntityByTarget(entityClass);
    this.connection.logger.logTransform(
      TRANSFORM_TYPE.RESPONSE,
      'Before',
      entityMetadata.name,
      null,
      dynamoEntity
    );

    const entityPrimaryKeys = Object.keys(entityMetadata.schema.primaryKey);
    const entityInternalAttributeKeys = entityMetadata.internalAttributes.map(
      attr => attr.name
    );

    const entityMetadataSchemaIndexes = entityMetadata.schema.indexes ?? {};
    const entityIndexes = Object.keys(entityMetadataSchemaIndexes)
      .map(key => {
        const currentIndex = entityMetadataSchemaIndexes[key];
        return Object.keys(currentIndex._interpolations ?? {});
      })
      .flat();

    const transformedEntity = Object.keys(dynamoEntity).reduce((acc, key) => {
      if (
        entityPrimaryKeys.includes(key) ||
        entityIndexes.includes(key) ||
        entityInternalAttributeKeys.includes(key)
      ) {
        return acc;
      }
      (acc as any)[key] = (dynamoEntity as any)[key];
      return acc;
    }, {} as Entity);

    this.connection.logger.logTransform(
      TRANSFORM_TYPE.RESPONSE,
      'After',
      entityMetadata.name,
      null,
      transformedEntity
    );

    return transformedEntity;
  }
}
