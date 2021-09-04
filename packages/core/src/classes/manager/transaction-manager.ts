import {WriteTransaction} from './../transaction/write-transaction';
import {Connection} from '../connection/connection';
import {DocumentClientTransactionTransformer} from '../transformer/document-client-transaction-transformer';
import {
  MANAGER_NAME,
  ReadTransactionItemLimitExceededError,
  STATS_TYPE,
  TRANSACTION_READ_ITEMS_LIMIT,
  TRANSACTION_WRITE_ITEMS_LIMIT,
  WriteTransactionItemLimitExceededError,
} from '@typedorm/common';
import {DynamoDB} from 'aws-sdk';
import {handleTransactionResult} from '../../helpers/handle-transaction-result';
import {ReadTransaction} from '../transaction/read-transaction';
import {MetadataOptions} from '../transformer/base-transformer';
import {getUniqueRequestId} from '../../helpers/get-unique-request-id';

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
  async write(
    transaction: WriteTransaction,
    metadataOptions?: MetadataOptions
  ) {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);
    const {
      transactionItemList,
      lazyTransactionWriteItemListLoader,
    } = this._dcTransactionTransformer.toDynamoWriteTransactionItems(
      transaction,
      {
        requestId,
      }
    );

    this.connection.logger.logInfo({
      requestId,
      scope: MANAGER_NAME.TRANSACTION_MANAGER,
      log: `Requested to write transaction for total ${transaction.items.length} items.`,
    });

    const lazyTransactionItems = (
      await Promise.all(
        lazyTransactionWriteItemListLoader.map(async (item: any) => {
          // if updating/removing unique attribute in transaction, get previous value of attributes
          const existingItem = await this.connection.entityManager.findOne(
            item.entityClass,
            item.primaryKeyAttributes,
            undefined,
            {
              requestId,
              returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
            }
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
      this.connection.logger.logInfo({
        requestId,
        scope: MANAGER_NAME.TRANSACTION_MANAGER,
        log: `Original items count ${transaction.items.length} expanded 
        to ${itemsToWriteInTransaction.length} to accommodate unique attributes.`,
      });
    }

    return this.writeRaw(itemsToWriteInTransaction, {
      requestId,
      returnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    });
  }

  /**
   * Processes transactions over document client's transaction api
   * @param transaction read transaction to process
   */
  async read(transaction: ReadTransaction, metadataOptions?: MetadataOptions) {
    const requestId = getUniqueRequestId(metadataOptions?.requestId);

    const {
      transactionItemList,
    } = this._dcTransactionTransformer.toDynamoReadTransactionItems(
      transaction,
      {
        requestId,
      }
    );

    if (transactionItemList.length > TRANSACTION_READ_ITEMS_LIMIT) {
      throw new ReadTransactionItemLimitExceededError(
        transactionItemList.length
      );
    }

    this.connection.logger.logInfo({
      requestId,
      scope: MANAGER_NAME.TRANSACTION_MANAGER,
      log: `Running a transaction read ${transactionItemList.length} items..`,
    });

    const transactionInput: DynamoDB.DocumentClient.TransactGetItemsInput = {
      TransactItems: transactionItemList,
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    };

    const transactionResult = this.connection.documentClient.transactGetRaw(
      transactionInput
    );

    const response = await handleTransactionResult(transactionResult);

    // log stats
    if (response?.ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId,
        scope: MANAGER_NAME.TRANSACTION_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: response.ConsumedCapacity,
      });
    }

    // Items are always returned in the same as they were requested.
    // An ordered array of up to 25 ItemResponse objects, each of which corresponds to the
    // TransactGetItem object in the same position in the TransactItems array
    return response.Responses?.map((response, index) => {
      if (!response.Item) {
        // If a requested item could not be retrieved, the corresponding ItemResponse object is Null,
        return null;
      }

      const originalRequest = transaction.items[index];
      return this._dcTransactionTransformer.fromDynamoEntity(
        originalRequest.get.item,
        response.Item,
        {
          requestId,
        }
      );
    });
  }

  /**
   * Perhaps, you are looking for ".write" instead.
   *
   * Writes items to dynamodb over document client's transact write API without performing any pre transforming
   * You would almost never need to use this.
   */
  async writeRaw(
    transactItems: DynamoDB.DocumentClient.TransactWriteItem[],
    metadataOptions: MetadataOptions
  ) {
    const transactionInput: DynamoDB.DocumentClient.TransactWriteItemsInput = {
      TransactItems: transactItems,
      ReturnConsumedCapacity: metadataOptions?.returnConsumedCapacity,
    };

    this.connection.logger.logInfo({
      requestId: metadataOptions?.requestId,
      scope: MANAGER_NAME.TRANSACTION_MANAGER,
      log: `Running a transaction write request for ${transactItems.length} items.`,
    });

    const transactionRequest = this.connection.documentClient.transactWriteRaw(
      transactionInput
    );

    const response = await handleTransactionResult(transactionRequest);

    // log stats
    if (response?.ConsumedCapacity) {
      this.connection.logger.logStats({
        requestId: metadataOptions?.requestId,
        scope: MANAGER_NAME.TRANSACTION_MANAGER,
        statsType: STATS_TYPE.CONSUMED_CAPACITY,
        consumedCapacityData: response.ConsumedCapacity,
      });
    }

    // return success when successfully processed all items in a transaction
    return {success: true};
  }
}
