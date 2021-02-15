import {Connection} from '../connection/connection';
import {DocumentClientRequestTransformer} from '../transformer/document-client-request-transformer';

export abstract class Batch {
  protected _dcRequestTransformer: DocumentClientRequestTransformer;

  constructor(connection: Connection) {
    this._dcRequestTransformer = new DocumentClientRequestTransformer(
      connection
    );
  }

  abstract add<Entity, PrimaryKeyAttributes>(item: any): this;
}
