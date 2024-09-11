import {AttributeMetadata} from './../metadata/attribute-metadata';
import {
  DynamoEntityIndexesSchema,
  DynamoEntityIndexSchema,
} from './../metadata/entity-metadata';
import {
  EntityTarget,
  Table,
  SparseIndexParseError,
  CONSUMED_CAPACITY_TYPE,
  InvalidDynamicUpdateAttributeValueError,
  isEmptyObject,
} from '@typedorm/common';
import {getConstructorForInstance} from '../../helpers/get-constructor-for-instance';
import {isScalarType} from '../../helpers/is-scalar-type';
import {parseKey} from '../../helpers/parse-key';
import {Connection} from '../connection/connection';
import {IsAutoGeneratedAttributeMetadata} from '../metadata/auto-generated-attribute-metadata';
import {DynamoEntitySchemaPrimaryKey} from '../metadata/entity-metadata';
import {isDynamoEntityKeySchema} from '../../helpers/is-dynamo-entity-key-schema';
import {isKeyOfTypeAliasSchema} from '../../helpers/is-key-of-type-alias-schema';
import {classToPlain} from 'class-transformer';
import {ExpressionInputParser} from '../expression/expression-input-parser';

export interface MetadataOptions {
  requestId?: string;
  returnConsumedCapacity?: CONSUMED_CAPACITY_TYPE;
}

export abstract class BaseTransformer {
  protected _expressionInputParser: ExpressionInputParser;

  constructor(protected connection: Connection) {
    this._expressionInputParser = new ExpressionInputParser();
  }
  /**
   * Returns table name decorated for given entity class
   * @param entityClass Entity Class
   */
  getTableNameForEntity<Entity>(entityClass: EntityTarget<Entity>) {
    const entityMetadata = this.connection.getEntityByTarget(entityClass);

    return entityMetadata.table.name;
  }

  applyClassTransformerFormations<Entity>(
    entity: Entity,
    schemaVersionAttribute?: string
  ) {
    const version = schemaVersionAttribute
      ? (entity as any)[schemaVersionAttribute]
      : undefined;
    const transformedPlainEntity = classToPlain<Entity>(entity, {
      enableImplicitConversion: true,
      excludePrefixes: ['__'], // exclude internal attributes
      version,
    });

    return transformedPlainEntity as Entity;
  }

  /**
   * Transforms entity to dynamo db entity schema
   * @param entity Entity to transform to DynamoDB entity type
   */
  toDynamoEntity<Entity>(entity: Entity) {
    const entityClass = getConstructorForInstance(entity);

    // retrieve metadata and parse it to schema
    const entityMetadata = this.connection.getEntityByTarget(entityClass);

    this.connection.getAttributesForEntity(entityClass).forEach(attr => {
      // if no explicit value was provided, look for default/autoGenerate values
      if (!Object.keys(entity as object).includes(attr.name)) {
        //  auto populate generated values
        if (IsAutoGeneratedAttributeMetadata(attr)) {
          entity = Object.assign(entity as object, {
            [attr.name]: attr.value,
          }) as Entity;
        }

        const attributeDefaultValue = (attr as AttributeMetadata)?.default;

        // include attribute with default value
        if (
          attributeDefaultValue &&
          typeof attributeDefaultValue === 'function'
        ) {
          const attrDefaultValue = attributeDefaultValue(entity);
          entity = Object.assign(entity as object, {
            [attr.name]: attrDefaultValue,
          }) as Entity;
        }
      }
    });

    // pass through entity to class transformer to have all the metadata applied
    const parsedEntity = this.applyClassTransformerFormations(
      entity,
      entityMetadata.schema.schemaVersionAttribute
    );

    const parsedPrimaryKey = this.recursiveParseEntity(
      entityMetadata.schema.primaryKey.attributes,
      parsedEntity
    );

    const indexesToParse = entityMetadata.schema.indexes ?? {};
    const rawParsedIndexes = this.recursiveParseEntity(
      indexesToParse,
      parsedEntity
    );

    const parsedIndexes = Object.keys(rawParsedIndexes).reduce(
      (acc, currIndexKey) => {
        const {metadata, attributes} = indexesToParse[currIndexKey];
        const currentParsedIndex = rawParsedIndexes[currIndexKey];

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

    return {...parsedEntity, ...formattedSchema};
  }

  getAffectedPrimaryKeyAttributes<Entity>(
    entityClass: EntityTarget<Entity>,
    attributes: Record<string, any>,
    attributesTypeMetadata: Record<string, 'static' | 'dynamic'>,
    options?: {
      additionalAttributesDict?: Record<string, any>;
    }
  ) {
    const {
      schema: {primaryKey},
    } = this.connection.getEntityByTarget(entityClass);

    const interpolations = primaryKey.metadata._interpolations;

    // if none of partition or sort key has any referenced attributes, return
    if (!interpolations || isEmptyObject(interpolations)) {
      return;
    }

    const affectedKeyAttributes = Object.entries(attributes).reduce(
      (acc, [attrKey, attrValue]: [string, any]) => {
        // bail early if current attribute type is not of type scalar
        if (!isScalarType(attrValue)) {
          return acc;
        }

        // resolve all interpolations
        Object.entries(interpolations).forEach(
          ([primaryKeyAttrName, primaryKeyAttrRefs]) => {
            // if no attributes are referenced for current primary key attribute, return
            if (!primaryKeyAttrRefs.includes(attrKey)) {
              return;
            }

            // if parsed value was of type we can not auto resolve indexes
            // this must be resolved by the dev
            if (attributesTypeMetadata[attrKey] === 'dynamic') {
              throw new InvalidDynamicUpdateAttributeValueError(
                attrKey,
                attrValue
              );
            }

            const parsedKey = parseKey(
              primaryKey.attributes[primaryKeyAttrName],
              {...options?.additionalAttributesDict, ...attributes}
            );
            acc[primaryKeyAttrName] = parsedKey;
          }
        );

        return acc;
      },
      {} as Record<string, string>
    );

    return affectedKeyAttributes;
  }

  /**
   * Returns all affected indexes for given attributes
   * @param entityClass Entity class
   * @param attributes Attributes to check affected indexes for
   * @param options
   */
  getAffectedIndexesForAttributes<Entity>(
    entityClass: EntityTarget<Entity>,
    attributes: Record<string, any>,
    attributesTypeMetadata: Record<string, 'static' | 'dynamic'>,
    options?: {
      nestedKeySeparator?: string;
      additionalAttributesDict?: Record<string, any>;
    }
  ) {
    const nestedKeySeparator = options?.nestedKeySeparator ?? '.';
    const {
      schema: {indexes},
    } = this.connection.getEntityByTarget(entityClass);

    const affectedIndexes = Object.entries(attributes).reduce(
      (acc, [attrKey, currAttrValue]) => {
        // if current value is not of scalar type skip checking index
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
              // if parsed value was of type we can not auto resolve indexes
              // this must be resolved by the dev
              if (attributesTypeMetadata[attrKey] === 'dynamic') {
                throw new InvalidDynamicUpdateAttributeValueError(
                  attrKey,
                  currAttrValue
                );
              }

              try {
                const parsedIndex = parseKey(
                  currIndex.attributes[interpolationKey],
                  {...options?.additionalAttributesDict, ...attributes}
                );
                acc[interpolationKey] = parsedIndex;
              } catch (err) {
                // if there was an error parsing sparse index, ignore
                if (!(err instanceof SparseIndexParseError)) {
                  throw err;
                }
              }
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
    attributes: Partial<Entity>
  ) {
    return this.recursiveParseEntity(primaryKey.attributes, attributes);
  }

  /**
   * Recursively parses all keys of given object and replaces placeholders with matching values
   * @private
   * @param schema schema to resolve
   * @param entity entity to resolve schema against
   */
  protected recursiveParseEntity<Entity = any>(
    schema: DynamoEntitySchemaPrimaryKey | DynamoEntityIndexesSchema,
    entity: Entity,
    isSparse = false
  ) {
    const parsedSchema = Object.keys(schema).reduce((acc, key) => {
      const currentValue = (schema as any)[key];

      if (
        typeof currentValue === 'string' ||
        isKeyOfTypeAliasSchema(currentValue)
      ) {
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
