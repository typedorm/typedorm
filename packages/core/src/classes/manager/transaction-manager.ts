import {DynamoDB} from 'aws-sdk';
import {TRANSACTION_WRITE_ITEMS_LIMIT} from '@typedorm/common';
import {WriteTransaction} from '../transaction/write-transaction';
import {Connection} from '../connection/connection';
import {isLazyTransactionWriteItemListLoader} from '../transformer/is-lazy-transaction-write-item-list-loder';

/**
 * Performs transactions using document client's writeTransaction
 */
export class TransactionManager {
  constructor(private connection: Connection) {}

  async write(transaction: WriteTransaction) {
    const transactionItems = (
      await Promise.all(
        transaction.items.map(async item => {
          if (!isLazyTransactionWriteItemListLoader(item)) {
            return item;
          }

          // if updating/removing unique attribute in transaction, get previous value of attributes
          const existingItem = await this.connection.entityManager.findOne(
            item.entityClass,
            item.primaryKeyAttributes
          );

          if (!existingItem) {
            throw new Error(
              `Failed to process entity "${
                item.entityClass.name
              }", could not find entity with primary key "${JSON.stringify(
                item.primaryKeyAttributes
              )}"`
            );
          }

          return item.lazyLoadTransactionWriteItems(existingItem);
        })
      )
    ).flat();

    if (transactionItems.length > TRANSACTION_WRITE_ITEMS_LIMIT) {
      throw new Error(
        `Transaction write limit exceeded, current transaction write limit is "${TRANSACTION_WRITE_ITEMS_LIMIT}"`
      );
    }

    const transactionInput: DynamoDB.DocumentClient.TransactWriteItemsInput = {
      TransactItems: transactionItems,
    };

    // FIXME: current promise implementation of document client transact write does not provide a way
    // the transaction was failed, as a work around we do following.
    // refer to this issue for more details https://github.com/aws/aws-sdk-js/issues/2464
    const transactionRequest = this.connection.documentClient.transactWrite(
      transactionInput
    );

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
    }) as Promise<DynamoDB.DocumentClient.TransactWriteItemsOutput>;
  }
}
