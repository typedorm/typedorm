import {DynamoDB} from 'aws-sdk';

export type LazyTransactionWriteItemListLoader = {
  lazyLoadTransactionWriteItems: (
    previousItemBody: any
  ) => DynamoDB.DocumentClient.TransactWriteItemList;
};

export const isLazyTransactionWriteItemListLoader = (
  response: any
): response is LazyTransactionWriteItemListLoader =>
  !!(
    (response as LazyTransactionWriteItemListLoader)
      .lazyLoadTransactionWriteItems &&
    typeof (response as LazyTransactionWriteItemListLoader)
      .lazyLoadTransactionWriteItems === 'function'
  );
