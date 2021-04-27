import {TRANSACTION_READ_ITEMS_LIMIT} from '../constants';

export class ReadTransactionItemLimitExceededError extends Error {
  name = 'ReadTransactionItemLimitExceededError';

  constructor(itemsCount: number) {
    super();
    this.message = `Transaction read limit exceeded. Tried to write total "${itemsCount}" items in a single transaction, 
    current transaction write limit is "${TRANSACTION_READ_ITEMS_LIMIT}".`;
  }
}
