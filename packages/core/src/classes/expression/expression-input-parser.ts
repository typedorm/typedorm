import {
  InvalidExpressionInputError,
  RequireOnlyOne,
  ScalarType,
} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {KeyCondition} from './key-condition';
import {Condition} from '@typedorm/common';

export type KeyConditionOptions = RequireOnlyOne<
  {
    [key in Condition.SimpleOperator]: ScalarType;
  } &
    {
      [key in Condition.FunctionOperator]: ScalarType;
    } &
    {
      [key in Condition.RangeOperator]: [ScalarType, ScalarType];
    }
>;

/**
 * Parses expression input to expression instances
 */
export class ExpressionInputParser {
  parseToKeyCondition(key: string, options: KeyConditionOptions) {
    // build sort key condition

    if (!options || isEmptyObject(options)) {
      throw new InvalidExpressionInputError(key, options);
    }
    const keyCondition = new KeyCondition();

    if (options.BETWEEN && options.BETWEEN.length) {
      keyCondition.between(key, options.BETWEEN);
    } else if (options.BEGINS_WITH) {
      keyCondition.beginsWith(key, options.BEGINS_WITH);
    } else {
      const operator = Object.keys(options)[0] as Condition.SimpleOperator;
      keyCondition.addBaseOperator(operator, key, options[operator]);
    }
    return keyCondition;
  }

  parseToFilter() {}
}
