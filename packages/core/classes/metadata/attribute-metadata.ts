import {Connection} from '../connection/connection';
import {BaseMetadata} from './base-metadata';

export interface AttributeMetadataOptions {
  connection: Connection;
  unique?: boolean;
  name: string;
  type: string;
}

export class AttributeMetadata extends BaseMetadata {
  readonly unique: boolean;
  readonly name: string;
  readonly type: string;

  constructor({connection, unique, name, type}: AttributeMetadataOptions) {
    super(connection);
    this.unique = !!unique;
    this.name = name;
    this.type = type;
  }
}
