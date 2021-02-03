import {
  DynamoEntityIndexesSchema,
  DynamoEntityIndexSchema,
} from './../metadata/entity-metadata';
import {EntityTarget, Table, SparseIndexParseError} from '@typedorm/common';
import {getConstructorForInstance} from '../../helpers/get-constructor-for-instance';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {isScalarType} from '../../helpers/is-scalar-type';
import {parseKey} from '../../helpers/parse-key';
import {Connection} from '../connection/connection';
import {IsAutoGeneratedAttributeMetadata} from '../metadata/auto-generated-attribute-metadata';
import {DynamoEntitySchemaPrimaryKey} from '../metadata/entity-metadata';
import {isDynamoEntityKeySchema} from '../../helpers/is-dynamo-entity-key-schma';

export abstract class BaseTransformer {
  constructor(protected connection: Connection) {}
  /**
   * Returns table name decorated for given entity class
   * @param entityClass Entity Class
   */
  getTableNameForEntity<Entity>(entityClass: EntityTarget<Entity>) {
    const entityMetadata = this.connection.getEntityByTarget(entityClass);

    return entityMetadata.table.name;
  }

  /**
   * Transforms entity to dynamo db entity schema
   * @param entity Entity to transform to DynamoDB entity type
   */
  toDynamoEntity<Entity>(entity: Entity) {
    const entityClass = getConstructorForInstance(entity);
    // retrieve metadata and parse it to schema
    const entityMetadata = this.connection.getEntityByTarget(entityClass);

    //  auto populate generated values
    this.connection.getAttributesForEntity(entityClass).forEach(attr => {
      if (IsAutoGeneratedAttributeMetadata(attr)) {
        entity = Object.assign({...entity, [attr.name]: attr.value});
      }
    });

    const parsedPrimaryKey = this.recursiveParseEntity(
      entityMetadata.schema.primaryKey.attributes,
      entity
    );

    const indexesToParse = entityMetadata.schema.indexes ?? {};
    const rawParsedIndexes = this.recursiveParseEntity(indexesToParse, entity);

    const parsedIndexes = Object.keys(rawParsedIndexes).reduce(
      (acc, currIndexKey) => {
        const {metadata, attributes} = indexesToParse[currIndexKey];
        const currentParsedIndex = rawParsedIndexes[currIndexKey];

        // validate if there are any duplicated attribute names
        Object.keys(currentParsedIndex).forEach(attr => {
          if (acc[attr]) {
            throw new Error(
              `Failed to parse entity "${entityMetadata.name}", duplicate attribute "${attr}".`
            );
          }
        });

        // if current index marked as sparse and one or more attribute is missing value, do not add it to schema
        if (metadata.isSparse) {
          const doesAllAttributesHaveValue = Object.keys(attributes).every(
            attr => {
              if (!currentParsedIndex[attr]) {
                return false;
              }
              return true;
            }
          );

          if (!doesAllAttributesHaveValue) {
            return acc;
          }
        }

        acc = {...acc, ...currentParsedIndex};
        return acc;
      },
      {} as {[key: string]: string}
    );

    // clone and cleanup any redundant keys
    const formattedSchema = {
      ...parsedPrimaryKey,
      ...parsedIndexes,
    };

    return {...entity, ...formattedSchema};
  }

  /**
   * Returns all affected indexes for given attributes
   * @param entityClass Entity class
   * @param attributes Attributes to check affected indexes for
   * @param options
   */
  getAffectedIndexesForAttributes<PrimaryKey, Entity>(
    entityClass: EntityTarget<Entity>,
    attributes: {
      [key in keyof Omit<Entity, keyof PrimaryKey>]?: any;
    } & {[key: string]: any},
    options?: {nestedKeySeparator: string}
  ) {
    const nestedKeySeparator = options?.nestedKeySeparator ?? '.';
    const {
      schema: {indexes},
    } = this.connection.getEntityByTarget(entityClass);

    const affectedIndexes = Object.keys(attributes).reduce(
      (acc, attrKey: string) => {
        const currAttrValue = attributes[attrKey];
        // if current value is not if scalar type skip checking index
        if (
          attrKey.includes(nestedKeySeparator) ||
          !isScalarType(currAttrValue)
        ) {
          return acc;
        }

        if (!indexes) {
          return acc;
        }

        Object.keys(indexes).forEach(key => {
          const currIndex = indexes[key];
          const interpolationsForCurrIndex =
            currIndex.metadata._interpolations ?? {};

          // if current index does not have any interpolations to resolve, move onto next one
          if (isEmptyObject(interpolationsForCurrIndex)) {
            return acc;
          }

          // check if attribute we are looking to update is referenced by any index
          Object.keys(interpolationsForCurrIndex).forEach(interpolationKey => {
            const currentInterpolation =
              interpolationsForCurrIndex[interpolationKey];

            if (currentInterpolation.includes(attrKey)) {
              const parsedIndex = parseKey(
                currIndex.attributes[interpolationKey],
                attributes
              );
              acc[interpolationKey] = parsedIndex;
            }
          });
        });

        return acc;
      },
      {} as any
    );
    return affectedIndexes;
  }

  /**
   * Returns a primary key of an entity
   * @param entityClass Class of entity
   * @param attributes Attributes to parse into primary key
   */
  getParsedPrimaryKey<Entity>(
    table: Table,
    primaryKey: DynamoEntitySchemaPrimaryKey,
    attributes: {[key in keyof Entity]: any}
  ) {
    return this.recursiveParseEntity(primaryKey.attributes, attributes);
  }

  /**
   * Recursively parses all keys of given object and replaces placeholders with matching values
   * @private
   * @param schema schema to resolve
   * @param entity entity to resolve schema against
   */
  protected recursiveParseEntity<Entity>(
    schema: DynamoEntitySchemaPrimaryKey | DynamoEntityIndexesSchema,
    entity: Entity,
    isSparse = false
  ) {
    const parsedSchema = Object.keys(schema).reduce((acc, key) => {
      const currentValue = (schema as any)[key];

      if (typeof currentValue === 'string') {
        try {
          acc[key] = parseKey(currentValue, entity, {
            isSparseIndex: isSparse,
          });
        } catch (err) {
          // if there was an error parsing sparse index, ignore
          if (!(err instanceof SparseIndexParseError)) {
            throw err;
          }
        }
      } else if (isDynamoEntityKeySchema(currentValue)) {
        acc[key] = this.recursiveParseEntity(
          currentValue.attributes,
          entity,
          !!(currentValue.metadata as DynamoEntityIndexSchema)?.isSparse
        );
      } else {
        acc[key] = this.recursiveParseEntity(currentValue, entity);
      }
      return acc;
    }, {} as any);

    return parsedSchema;
  }
}