import {UPDATE_KEYWORD} from '@typedorm/common';
import {BaseUpdateExpressionInput} from '../base-update-expression-input';

export class RemoveUpdate extends BaseUpdateExpressionInput {
  prefix = UPDATE_KEYWORD.REMOVE;

  remove(keyOrPath: string) {
    const attrExpName = this.addExpressionName(keyOrPath);

    this.appendToExpression(`${attrExpName}`);
    return this;
  }
}
