import 'reflect-metadata';
import {MetadataManager} from '../metadata/metadata-manager';
import {AttributeRawMetadataOptions} from '../metadata/metadata-storage';

export type AttributeOptionsUniqueType = boolean | {prefix: string};

export interface AttributeOptions {
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
}

export function Attribute(options?: AttributeOptions): PropertyDecorator {
  return (target, propertyKey): void => {
    let type = Reflect.getMetadata('design:type', target, propertyKey).name;

    if (options?.isEnum) {
      // default to "String" when attribute is marked as enum
      type = 'String';
    }

    const attributeProps = {
      name: propertyKey.toString(),
      type,
      unique: options?.unique,
    } as AttributeRawMetadataOptions;

    MetadataManager.metadataStorage.addRawAttribute(
      target.constructor,
      attributeProps
    );
  };
}
