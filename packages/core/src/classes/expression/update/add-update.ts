import {ScalarType, UpdateType} from '@typedorm/common';
import {BaseUpdateExpressionInput} from '../base-update-expression-input';

export class AddUpdate extends BaseUpdateExpressionInput {
  protected prefix: UpdateType.Action = 'ADD';

  addTo(key: string, value: number | ScalarType[]): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);

    this.appendToExpression(`${attrExpName} ${attrExpValue}`);
    return this;
  }
}
