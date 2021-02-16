import {WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';
import {DocumentClientBatchTransformer} from '../transformer/document-client-batch-transformer';

export class BatchManager {
  private _dcBatchTransformer: DocumentClientBatchTransformer;
  constructor(private connection: Connection) {
    this._dcBatchTransformer = new DocumentClientBatchTransformer(connection);
  }

  async write(batch: WriteBatch) {
    const {
      batchWriteRequestMapItems,
      lazyTransactionWriteItemListLoaderItems,
      transactionListItems,
    } = this._dcBatchTransformer.toDynamoWriteBatchItems(batch);

    // TODO: run all batch and non batch operations
    this.connection.documentClient.batchWrite({
      RequestItems: {},
    });
  }
}
