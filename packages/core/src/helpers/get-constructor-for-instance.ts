import {EntityInstance, EntityTarget, IsEntityInstance} from '@typedorm/common';

export function getConstructorForInstance<Entity>(entity: Entity) {
  let entityClass: EntityTarget<Entity>;
  if (IsEntityInstance(entity)) {
    entityClass = (entity as EntityInstance).constructor;
  } else {
    throw new Error('Cannot transform Class to dynamo object');
  }
  return entityClass;
}
