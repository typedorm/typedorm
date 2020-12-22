import {DynamoDB} from 'aws-sdk';
import {WriteTransactionCreate, WriteTransactionUpdate} from './transaction';

export function isCreateTransaction<Entity>(
  item: any
): item is WriteTransactionCreate<Entity> {
  return (item as WriteTransactionCreate<Entity>).create !== undefined;
}

export function isUpdateTransaction<PrimaryKey, Entity>(
  item: any
): item is WriteTransactionUpdate<PrimaryKey, Entity> {
  return (
    (item as WriteTransactionUpdate<PrimaryKey, Entity>).update !== undefined
  );
}

export const isWriteTransactionItemList = (
  item: any
): item is DynamoDB.DocumentClient.TransactWriteItemList =>
  !!(item as DynamoDB.DocumentClient.TransactWriteItemList).length &&
  !!(
    (item as DynamoDB.DocumentClient.TransactWriteItemList)[0]
      ?.ConditionCheck ||
    (item as DynamoDB.DocumentClient.TransactWriteItemList)[0]?.Delete ||
    (item as DynamoDB.DocumentClient.TransactWriteItemList)[0]?.Put ||
    (item as DynamoDB.DocumentClient.TransactWriteItemList)[0]?.Update
  );
