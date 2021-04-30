import {applyMixins} from '../../helpers/apply-mixins';
import {Connection} from '../connection/connection';
import {ExpressionBuilder} from '../expression/expression-builder';
import {ExpressionInputParser} from '../expression/expression-input-parser';
import {BaseTransformer} from './base-transformer';
import {DocumentClientRequestTransformer} from './document-client-request-transformer';
import {EntityTransformer} from './entity-transformer';

export interface LowOrderTransformers
  extends DocumentClientRequestTransformer,
    EntityTransformer {}

export class LowOrderTransformers {
  constructor(public connection: Connection) {
    /**
     * running mixins over extended classes does not roll over expressions
     */
    this._expressionBuilder = new ExpressionBuilder();
    this._expressionInputParser = new ExpressionInputParser();
  }
}

// dynamically extend both low order transformers
applyMixins(LowOrderTransformers, [
  BaseTransformer,
  EntityTransformer,
  DocumentClientRequestTransformer,
]);
