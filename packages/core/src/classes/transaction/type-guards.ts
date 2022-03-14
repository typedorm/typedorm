import {DocumentClientTypes} from '@typedorm/document-client';
import {
  WriteTransactionCreate,
  WriteTransactionDelete,
  WriteTransactionUpdate,
} from './write-transaction';
import {ReadTransactionGet} from './read-transaction';

export function isTransactionAddCreateItem<Entity>(
  item: any
): item is WriteTransactionCreate<Entity> {
  return (item as WriteTransactionCreate<Entity>).create !== undefined;
}

export function isTransactionAddGetItem<Entity, PrimaryKey>(
  item: any
): item is ReadTransactionGet<Entity, PrimaryKey> {
  return (item as ReadTransactionGet<Entity, PrimaryKey>).get !== undefined;
}

export function isTransactionAddUpdateItem<Entity, PrimaryKey>(
  item: any
): item is WriteTransactionUpdate<Entity, PrimaryKey, {}> {
  return (
    (item as WriteTransactionUpdate<Entity, PrimaryKey, {}>).update !==
    undefined
  );
}

export function isTransactionAddDeleteItem<Entity, PrimaryKey>(
  item: any
): item is WriteTransactionDelete<Entity, PrimaryKey> {
  return (
    (item as WriteTransactionDelete<Entity, PrimaryKey>).delete !== undefined
  );
}

export const isWriteTransactionItemList = (
  item: any
): item is DocumentClientTypes.TransactWriteItemList =>
  !!(item as DocumentClientTypes.TransactWriteItemList).length &&
  !!(
    (item as DocumentClientTypes.TransactWriteItemList)[0]?.ConditionCheck ||
    (item as DocumentClientTypes.TransactWriteItemList)[0]?.Delete ||
    (item as DocumentClientTypes.TransactWriteItemList)[0]?.Put ||
    (item as DocumentClientTypes.TransactWriteItemList)[0]?.Update
  );
