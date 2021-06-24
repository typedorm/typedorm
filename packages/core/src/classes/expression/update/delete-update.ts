import {ScalarType, UpdateType} from '@typedorm/common';
import {Update} from './update';

export class DeleteUpdate extends Update {
  protected prefix: UpdateType.Action = 'DELETE';

  /**
   * Deletes elements from a set
   */
  delete(key: string, value: ScalarType[]) {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);

    this.appendToExpression(`${attrExpName} ${attrExpValue}`);
    return this;
  }
}
