import 'reflect-metadata';
import {MetadataManager} from '../metadata-manager';
import {AttributeRawMetadataOptions} from '../metadata-storage';

export interface AttributeOptions {
  /**
   * item will be managed using transaction to ensure it's consistency
   * @default false
   */
  unique: boolean;
}

export function Attribute(options?: AttributeOptions): PropertyDecorator {
  return (target, propertyKey): void => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);

    const attributeProps = {
      name: propertyKey.toString(),
      type: type.name,
      unique: options?.unique,
    } as AttributeRawMetadataOptions;

    MetadataManager.metadataStorage.addRawAttribute(
      target.constructor,
      attributeProps
    );
  };
}
