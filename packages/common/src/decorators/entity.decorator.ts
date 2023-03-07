import {MetadataManager} from '../metadata/metadata-manager';
import {EntityRawMetadataOptions} from '../metadata/metadata-storage';

type Constructor = {new (...args: any[]): {}};

export function Entity<E>({
  table,
  primaryKey,
  indexes,
  name,
  versionAttribute
}: Pick<
  EntityRawMetadataOptions<E>,
  'name' | 'table' | 'indexes' | 'primaryKey' | 'versionAttribute'
>) {
  return function <E extends Constructor>(target: E) {
    const originalTarget = target;

    MetadataManager.metadataStorage.addRawEntity({
      name,
      table,
      target,
      primaryKey,
      indexes,
      versionAttribute,
    });

    return originalTarget;
  };
}
