import {TRANSACTION_WRITE_ITEMS_LIMIT} from '../constants';

export class WriteTransactionItemLimitExceededError extends Error {
  name = 'WriteTransactionItemLimitExceededError';

  constructor(originalItemsCount: number, generatedItemsCount?: number) {
    super();
    this.message = `Transaction write limit exceeded. Tried to write total "${originalItemsCount}" items in a single transaction, 
    current transaction write limit is "${TRANSACTION_WRITE_ITEMS_LIMIT}".`;

    if (generatedItemsCount && generatedItemsCount > originalItemsCount) {
      this.message += `\n
      This could be because, how unique entities are handled. 
      Initially, "${originalItemsCount}" items were requested to be processed in a transaction,
      but after the unique entities transform, transaction write items were at "${generatedItemsCount}"
      which is larger amount than the number of items that dynamodb can proceed in a single transaction.
      ${generatedItemsCount}`;
    }
  }
}
