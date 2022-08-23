import {UpdateType} from '@typedorm/common';
import {BaseExpressionInput} from '../base-expression-input';

export class Update extends BaseExpressionInput {
  // empty prefix for base update type
  protected prefix = '';

  protected getExpNameKey(key: string): string {
    return `#UE_${key}`;
  }
  protected getExpValueKey(key: string): string {
    return `:UE_${key}`;
  }

  /**
   * @override and
   */
  and(): this {
    this.expression += ', ';
    return this;
  }

  /**
   * @override or
   */
  or(): this {
    throw new Error('"or" operation is not supported with update expression.');
  }

  /**
   * Support merging multiple update expressions with same keyword
   * @override merge
   */
  merge(update: Update) {
    const {expression, names, values, prefix} = update;

    if (!prefix) {
      throw new Error(
        'Can not merge with Base `Update` type, merging expression must have a valid prefix.'
      );
    }

    // if merging condition does not have anything to merge return
    if (!expression) {
      return this;
    }

    if (update.constructor === this.constructor) {
      this.expression += this.expression ? ',' : '';
      this.appendToExpression(expression);
    } else {
      this.appendToExpression(`${prefix} ${expression}`);
    }

    this.names = {...this.names, ...names};
    this.values = {...this.values, ...values};

    return this;
  }

  /**
   * Support merging multiple update expressions with same or different keywords
   * @override  mergeMany
   */
  mergeMany<T = this>(inputs: T[]): any {
    const merged = inputs.reduce((acc, upd) => {
      acc.merge(upd as unknown as this);
      return acc;
    }, this);

    return merged;
  }

  protected getSymbolForArithmeticOperator(
    operator: UpdateType.ArithmeticOperator
  ) {
    const symbolMap = {
      INCREMENT_BY: '+',
      DECREMENT_BY: '-',
    };
    return symbolMap[operator];
  }
}
