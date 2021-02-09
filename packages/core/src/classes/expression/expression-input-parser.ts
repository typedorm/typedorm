import {
  ATTRIBUTE_TYPE,
  FilterType,
  InvalidExpressionInputError,
  NonKeyAttributes,
  RequireAtLeastTwo,
  RequireOnlyOne,
  ScalarType,
} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {KeyCondition} from './key-condition';
import {KeyConditionType} from '@typedorm/common';

export type KeyConditionOptions = RequireOnlyOne<
  {
    [key in KeyConditionType.SimpleOperator]: ScalarType;
  } &
    {
      [key in KeyConditionType.FunctionOperator]: ScalarType;
    } &
    {
      [key in KeyConditionType.RangeOperator]: [ScalarType, ScalarType];
    }
>;

type BaseFilterOptions = RequireOnlyOne<
  {
    [key in FilterType.SimpleOperator]: ScalarType;
  } &
    {
      [key in FilterType.RangeOperator]: [ScalarType, ScalarType];
    } &
    {
      [key in Extract<
        FilterType.FunctionOperator,
        'CONTAINS' | 'BEGINS_WITH'
      >]: ScalarType;
    } &
    {
      [key in Extract<
        FilterType.FunctionOperator,
        'ATTRIBUTE_TYPE'
      >]: ATTRIBUTE_TYPE;
    } &
    {
      [key in Extract<FilterType.FunctionOperator, 'SIZE'>]: RequireOnlyOne<
        {
          [key in FilterType.SimpleOperator]: ScalarType;
        }
      >;
    }
>;

type AttributeFilterOptions<PrimaryKey, Entity> =
  | NonKeyAttributes<PrimaryKey, Entity, BaseFilterOptions>
  | NonKeyAttributes<
      PrimaryKey,
      Entity,
      Extract<
        FilterType.FunctionOperator,
        'ATTRIBUTE_EXISTS' | 'ATTRIBUTE_NOT_EXISTS'
      >
    >;

export type FilterOptions<PrimaryKey, Entity> = RequireOnlyOne<
  {
    [key in Exclude<FilterType.LogicalOperator, 'NOT'>]: RequireAtLeastTwo<
      AttributeFilterOptions<PrimaryKey, Entity>
    >;
  } &
    {
      [key in Extract<FilterType.LogicalOperator, 'NOT'>]: RequireOnlyOne<
        AttributeFilterOptions<PrimaryKey, Entity>
      >;
    } &
    AttributeFilterOptions<PrimaryKey, Entity>
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
      const operator = Object.keys(
        options
      )[0] as KeyConditionType.SimpleOperator;
      keyCondition.addBaseOperator(operator, key, options[operator]);
    }
    return keyCondition;
  }

  parseToFilter<PrimaryKey, Entity>(
    options: FilterOptions<PrimaryKey, Entity>
  ) {}
}
