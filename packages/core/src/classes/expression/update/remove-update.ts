import {UpdateType} from '@typedorm/common';
import {Update} from './update';

export class RemoveUpdate extends Update {
  protected prefix: UpdateType.Action = 'REMOVE';

  remove(keyOrPath: string) {
    const attrExpName = this.addExpressionName(keyOrPath);

    this.appendToExpression(`${attrExpName}`);
    return this;
  }
}
