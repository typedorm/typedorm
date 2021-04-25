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

    const transactionInput: DynamoDB.DocumentClient.TransactWriteItemsInput = {
      TransactItems: itemsToWriteInTransaction,
    };

    this.connection.logger.logInfo(
      MANAGER_NAME.TRANSACTION_MANAGER,
      `Running a batch write request for ${itemsToWriteInTransaction.length} items`
    );

    const transactionRequest = this.connection.documentClient.transactWrite(
      transactionInput
    );

    await handleTransactionRequest(transactionRequest);

    // return success when successfully processed all items in a transaction
    return {success: true};
  }
}
