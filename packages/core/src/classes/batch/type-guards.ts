import {isEmptyObject} from '@typedorm/common';
import {WriteBatchCreate, WriteBatchDelete} from './write-batch';

export function isBatchAddCreateItem<Entity>(
  item: any
): item is WriteBatchCreate<Entity> {
  return !isEmptyObject(item) && !!(item as WriteBatchCreate<Entity>).create;
}

export function isBatchAddDeleteItem<Entity, PrimaryKey>(
  item: any
): item is WriteBatchDelete<Entity, PrimaryKey> {
  return (
    !isEmptyObject(item) &&
    !!(item as WriteBatchDelete<Entity, PrimaryKey>).delete
  );
}
