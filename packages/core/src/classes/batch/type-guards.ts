import {isEmptyObject} from '../../helpers/is-empty-object';
import {WriteBatchCreate, WriteBatchDelete} from './write-batch';

export function isBatchAddCreateItem<Entity>(
  item: any
): item is WriteBatchCreate<Entity> {
  return !!(item as WriteBatchCreate<Entity>).create && !isEmptyObject(item);
}

export function isBatchAddDeleteItem<Entity, PrimaryKey>(
  item: any
): item is WriteBatchDelete<Entity, PrimaryKey> {
  return (
    !!(item as WriteBatchDelete<Entity, PrimaryKey>).delete &&
    !isEmptyObject(item)
  );
}
