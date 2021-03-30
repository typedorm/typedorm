import 'reflect-metadata';
import {ScalarType} from '../helpers/scalar-type';
import {MetadataManager} from '../metadata/metadata-manager';
import {
  AttributeRawMetadataOptions,
  PrimaryKey,
} from '../metadata/metadata-storage';
import {MissingReflectMetadataError} from '../error';

export type AttributeOptionsUniqueType = boolean | PrimaryKey;

export interface AttributeOptions<Entity> {
  /**
   * Item will be managed using transaction to ensure it's consistency
   * When value of unique is of type boolean, entity name is used to auto generated unique prefix
   * @default false
   *
   */
  unique?: AttributeOptionsUniqueType;
  /**
   * Mark property as enum
   * @required when property of type enum is referenced in key
   * @default false
   */
  isEnum?: boolean;
  /**
   * Assign default value to attribute
   */
  default?: ScalarType | ((entity: Entity) => ScalarType);
  /**
   * Defines whether the attribute should be hidden from response returned to client
   * @default false
   */
  hidden?: boolean;
}

export function Attribute<Entity = any>(
  options?: AttributeOptions<Entity>
): PropertyDecorator {
  return (target, propertyKey): void => {
    const reflectedMetadata = Reflect.getMetadata(
      'design:type',
      target,
      propertyKey
    );

    if (!reflectedMetadata) {
      throw new MissingReflectMetadataError('design:type');
    }

    let type = reflectedMetadata.name;

    if (options?.isEnum) {
      // default to "String" when attribute is marked as enum
      type = 'String';
    }

    const attributeProps = {
      name: propertyKey.toString(),
      type,
      unique: options?.unique,
      default: options?.default,
      hidden: options?.hidden,
    } as AttributeRawMetadataOptions;

    MetadataManager.metadataStorage.addRawAttribute(
      target.constructor,
      attributeProps
    );
  };
}
