import {Connection} from '../connection/connection';
import {LowOrderTransformers} from './low-order-transformers';

export class DocumentClientBatchTransformer extends LowOrderTransformers {
  constructor(connection: Connection) {
    super(connection);
  }
}
