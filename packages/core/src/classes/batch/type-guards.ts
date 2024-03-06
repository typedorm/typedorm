import {isEmptyObject} from '@typedorm/common';
import {WriteBatchCreate, WriteBatchPut, WriteBatchDelete} from './write-batch';

export function isBatchAddCreateItem<Entity>(
  item: any
): item is WriteBatchCreate<Entity> {
  return !isEmptyObject(item) && !!(item as WriteBatchCreate<Entity>).create;
}

export function isBatchAddPutItem<Entity>(
  item: any
): item is WriteBatchPut<Entity> {
  return !isEmptyObject(item) && !!(item as WriteBatchPut<Entity>).put;
}

export function isBatchAddDeleteItem<Entity, PrimaryKey>(
  item: any
): item is WriteBatchDelete<Entity, PrimaryKey> {
  return (
    !isEmptyObject(item) &&
    !!(item as WriteBatchDelete<Entity, PrimaryKey>).delete
  );
}
