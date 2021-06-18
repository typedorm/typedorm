import {UpdateType, UPDATE_KEYWORD} from '@typedorm/common';
import {BaseExpressionInput} from './base-expression-input';

export abstract class BaseUpdateExpressionInput extends BaseExpressionInput {
  protected abstract prefix: UPDATE_KEYWORD;
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
  merge(update: BaseUpdateExpressionInput) {
    const {expression, names, values, prefix} = update;

    // if merging condition does not have anything to merge return
    if (!expression) {
      return this;
    }

    // if base condition does not have any expression replace
    if (!this.expression) {
      this.expression += expression;
      this.names = names;
      this.values = values;
      return this;
    }

    Object.keys(names).forEach(nameKey => {
      if (this.names[nameKey]) {
        throw new Error(
          `Failed to build update expression, there are multiple update input referencing the same attribute "${nameKey}".`
        );
      }
    });

    if (update.constructor === this.constructor) {
      this.expression += ',';
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
      acc.merge((upd as unknown) as this);
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
