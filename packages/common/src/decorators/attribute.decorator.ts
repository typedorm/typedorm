import 'reflect-metadata';
import {MetadataManager} from '../metadata/metadata-manager';
import {AttributeRawMetadataOptions} from '../metadata/metadata-storage';

export interface AttributeOptions {
  /**
   * Item will be managed using transaction to ensure it's consistency
   * @default false
   */
  unique?: boolean;
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
