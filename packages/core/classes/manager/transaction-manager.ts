import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {TRANSACTION_WRITE_ITEMS_LIMIT} from '@typedorm/common';
import {WriteTransaction} from '../transaction/write-transaction';
import {BaseManager} from './base-manager';

/**
 * Performs transactions using document client's writeTransaction
 */
export class TransactionManager extends BaseManager {
  constructor() {
    super();
  }

  async write(transaction: WriteTransaction) {
    if (transaction.items.length > TRANSACTION_WRITE_ITEMS_LIMIT) {
      throw new Error(
        `Transaction write limit exceeded, current transaction write limit is "${TRANSACTION_WRITE_ITEMS_LIMIT}"`
      );
    }

    const transactionInput: DocumentClient.TransactWriteItemsInput = {
      TransactItems: transaction.items,
    };

    // FIXME: current promise implementation of document client transact write does not provide a way
    // the transaction was failed, as a work around we do following.
    // refer to this issue for more details https://github.com/aws/aws-sdk-js/issues/2464
    const transactionRequest = this._dc.transactWrite(transactionInput);

    let cancellationReasons: any[];
    transactionRequest.on('extractError', response => {
      try {
        cancellationReasons = JSON.parse(response.httpResponse.body.toString())
          .CancellationReasons;
      } catch (err) {
        // suppress this just in case some types of errors aren't JSON parseable
        console.error('Error extracting cancellation error', err);
      }
    });

    return new Promise((resolve, reject) => {
      transactionRequest.send((err, response) => {
        if (err) {
          // pull all reasons from response and map them to errors
          const transactionError = new Error() as any;
          transactionError.code = err.code;
          transactionError.message = err.message;
          transactionError.cancellationReasons = cancellationReasons.map(
            reason => {
              return {
                code: reason.Code,
                message: reason.Message,
              };
            }
          );
          return reject(transactionError);
        }
        return resolve(response);
      });
    });
  }
}
