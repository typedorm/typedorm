import {UpdateType, ScalarType, UPDATE_KEYWORD} from '@typedorm/common';
import {BaseUpdateExpressionInput} from '../base-update-expression-input';

export class SetUpdate extends BaseUpdateExpressionInput {
  prefix = UPDATE_KEYWORD.SET;

  /**
   * Support specifying additional arithmetic operations
   */
  setTo(
    key: string,
    value: any,
    incrementBy?: UpdateType.ArithmeticOperator
  ): this {
    const arithmeticOperator = incrementBy
      ? this.getSymbolForArithmeticOperator(incrementBy)
      : '';

    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);
    this.appendToExpression(
      `${attrExpName} ` +
        `${this.getSymbolForOperator('EQ')} ` +
        // builds exp like #UE_age = #UE_age + :UE_age if incrementBy was provided
        `${arithmeticOperator ? `${attrExpName} ${arithmeticOperator} ` : ''}` +
        `${attrExpValue}`
    );
    return this;
  }

  setToIfNotExists(key: string, value: any, otherKeyAttribute?: string): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);

    // if no other key is specified, use default value of updating key
    const keyofValueToCheck = otherKeyAttribute
      ? this.addExpressionName(otherKeyAttribute)
      : attrExpName;

    this.appendToExpression(
      `${attrExpName} ` +
        `${this.getSymbolForOperator('EQ')} ` +
        `if_not_exists(${keyofValueToCheck}, ${attrExpValue})`
    );
    return this;
  }

  setOrAppendToList(
    key: string,
    value: ScalarType[],
    otherKeyAttribute?: string
  ): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);

    // if no other key is specified, use default value of updating key
    const keyofValueToAppend = otherKeyAttribute
      ? this.addExpressionName(otherKeyAttribute)
      : attrExpName;

    this.appendToExpression(
      `${attrExpName} ` +
        `${this.getSymbolForOperator('EQ')} ` +
        `list_append(${keyofValueToAppend}, ${attrExpValue})`
    );
    return this;
  }
}
