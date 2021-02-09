import {
  FindKeyListOperator,
  FindKeyScalarOperator,
  FindKeySimpleOperator,
  InvalidExpressionInputError,
  RequireOnlyOne,
  ScalarType,
} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {KeyCondition} from './key-condition';

export type KeyConditionOptions = RequireOnlyOne<
  {
    [key in FindKeyScalarOperator]: ScalarType;
  } &
    {
      [key in FindKeyListOperator]: [ScalarType, ScalarType];
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
      const operator = Object.keys(options)[0] as FindKeySimpleOperator;
      keyCondition.addBaseOperatorCondition(operator, key, options[operator]);
    }

    return keyCondition;
  }
}
