import {WriteBatch} from '../batch/write-batch';
import {Connection} from '../connection/connection';

export class BatchManager {
  constructor(private connection: Connection) {}

  async write(batch: WriteBatch) {
    // separate transaction items and normal items

    const {
      simpleRequestItems,
      transactionListItems,
      lazyTransactionListItems,
    } = batch.items;

    // this.connection.documentClient.batchWrite
  }
}
