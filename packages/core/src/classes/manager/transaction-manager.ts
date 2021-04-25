import {WriteTransaction} from './../transaction/write-transaction';
import {Connection} from '../connection/connection';
import {DocumentClientTransactionTransformer} from '../transformer/document-client-transaction-transformer';
import {
  MANAGER_NAME,
  TRANSACTION_WRITE_ITEMS_LIMIT,
  WriteTransactionItemLimitExceededError,
} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {handleTransactionRequest} from '../../helpers/handle-transaction-request';

export class TransactionManager {
  private _dcTransactionTransformer: DocumentClientTransactionTransformer;

  constructor(private connection: Connection) {
    this._dcTransactionTransformer = new DocumentClientTransactionTransformer(
      connection
    );
  }

  /**
   * Processes transactions over document client's transaction api
   * @param transaction Write transaction to process
   */
  async write(transaction: WriteTransaction) {
    const {
      transactionItemList,
      lazyTransactionWriteItemListLoader,
    } = this._dcTransactionTransformer.toDynamoWriteTransactionItems(
      transaction
    );

    this.connection.logger.logInfo(
      MANAGER_NAME.TRANSACTION_MANAGER,
      `Requested to write transaction for total ${transaction.items.length} items.`
    );

    const lazyTransactionItems = (
      await Promise.all(
        lazyTransactionWriteItemListLoader.map(async item => {
          // if updating/removing unique attribute in transaction, get previous value of attributes
          const existingItem = await this.connection.entityManager.findOne(
            item.entityClass,
            item.primaryKeyAttributes
          );
          return item.lazyLoadTransactionWriteItems(existingItem);
        })
      )
    ).flat();
    const itemsToWriteInTransaction = [
      ...transactionItemList,
      ...lazyTransactionItems,
    ];

    if (itemsToWriteInTransaction.length > TRANSACTION_WRITE_ITEMS_LIMIT) {
      throw new WriteTransactionItemLimitExceededError(
        transaction.items.length,
        itemsToWriteInTransaction.length
      );
    }

    if (itemsToWriteInTransaction.length > transaction.items.length) {
      this.connection.logger.logInfo(
        MANAGER_NAME.TRANSACTION_MANAGER,
        `Original items count ${transaction.items.length} expanded 
        to ${itemsToWriteInTransaction.length} to accommodate unique attributes.`
      );
    }

    return this.writeRaw(itemsToWriteInTransaction);
  }

  /**
   * Perhaps, you are looking for ".write" instead.
   *
   * Writes items to dynamodb over document client's transact write API without performing any pre transforming
   * You would almost never need to use this.
   */
  async writeRaw(transactItems: DynamoDB.DocumentClient.TransactWriteItem[]) {
    const transactionInput: DynamoDB.DocumentClient.TransactWriteItemsInput = {
      TransactItems: transactItems,
    };

    this.connection.logger.logInfo(
      MANAGER_NAME.TRANSACTION_MANAGER,
      `Running a batch write request for ${transactItems.length} items`
    );

    const transactionRequest = this.connection.documentClient.transactWrite(
      transactionInput
    );

    await handleTransactionRequest(transactionRequest);

    // return success when successfully processed all items in a transaction
    return {success: true};
  }
}
