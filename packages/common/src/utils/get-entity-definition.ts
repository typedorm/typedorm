import {MetadataManager} from '../metadata/metadata-manager';

export function getEntityDefinition<Entity>(input: string | Entity) {
  if (typeof input === 'string') {
    return MetadataManager.metadataStorage.getEntityByName(input);
  }

  if (typeof input === 'object' && input !== null) {
    const entityName = (input as any).__en;

    if (!entityName) {
      return;
    }
    return MetadataManager.metadataStorage.getEntityByName(entityName);
  }
  return;
}
