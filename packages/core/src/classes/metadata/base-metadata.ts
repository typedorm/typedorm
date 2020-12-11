import {Connection} from '../connection/connection';

export abstract class BaseMetadata {
  constructor(public connection: Connection) {}
}
