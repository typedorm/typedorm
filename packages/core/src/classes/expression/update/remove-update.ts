import {UpdateType} from '@typedorm/common';
import {BaseUpdateExpressionInput} from '../base-update-expression-input';

export class RemoveUpdate extends BaseUpdateExpressionInput {
  protected prefix: UpdateType.Action = 'REMOVE';

  remove(keyOrPath: string) {
    const attrExpName = this.addExpressionName(keyOrPath);

    this.appendToExpression(`${attrExpName}`);
    return this;
  }
}
