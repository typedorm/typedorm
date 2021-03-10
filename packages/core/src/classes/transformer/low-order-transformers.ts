import {applyMixins} from '../../helpers/apply-mixins';
import {Connection} from '../connection/connection';
import {BaseTransformer} from './base-transformer';
import {DocumentClientRequestTransformer} from './document-client-request-transformer';
import {EntityTransformer} from './entity-transformer';

export interface LowOrderTransformers
  extends DocumentClientRequestTransformer,
    EntityTransformer {}

export class LowOrderTransformers {
  constructor(public connection: Connection) {}
}

// dynamically extend both low order transformers
applyMixins(LowOrderTransformers, [
  BaseTransformer,
  EntityTransformer,
  DocumentClientRequestTransformer,
]);
