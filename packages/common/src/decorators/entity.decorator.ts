import {MetadataManager} from '../metadata/metadata-manager';
import {EntityRawMetadataOptions} from '../metadata/metadata-storage';

export function Entity({
  table,
  primaryKey,
  indexes,
  name,
}: Pick<
  EntityRawMetadataOptions,
  'name' | 'table' | 'indexes' | 'primaryKey'
>): ClassDecorator {
  return target => {
    const originalTarget = target;

    MetadataManager.metadataStorage.addRawEntity({
      name,
      table,
      target,
      primaryKey,
      indexes,
    });

    return originalTarget;
  };
}
