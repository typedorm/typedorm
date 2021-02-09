import {
  ATTRIBUTE_TYPE,
  FilterType,
  InvalidExpressionInputError,
  NonKeyAttributes,
  RequireAtLeastOne,
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

type AttributeFilterOptions<PrimaryKey, Entity> =
  // Require max 1 operator on non key attribute
  | NonKeyAttributes<
      PrimaryKey,
      Entity,
      RequireOnlyOne<
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
            [key in Extract<
              FilterType.FunctionOperator,
              'SIZE'
            >]: RequireOnlyOne<
              {
                [key in FilterType.SimpleOperator]: ScalarType;
              }
            >;
          }
      >
    >
  // Require 'ATTRIBUTE_EXISTS' or 'ATTRIBUTE_NOT_EXISTS' on non key attribute
  | NonKeyAttributes<
      PrimaryKey,
      Entity,
      Extract<
        FilterType.FunctionOperator,
        'ATTRIBUTE_EXISTS' | 'ATTRIBUTE_NOT_EXISTS'
      >
    >;

type RecursiveFilterOptions<PrimaryKey, Entity> = {
  // for `AND` and `OR` logical operators require at least one of defined options or other self
  [key in Extract<FilterType.LogicalOperator, 'OR' | 'AND'>]: RequireAtLeastOne<
    AttributeFilterOptions<PrimaryKey, Entity> &
      RecursiveFilterOptions<PrimaryKey, Entity>
  >;
} &
  // for `NOT` logical operators require one from defined options or other self
  {
    [key in Extract<FilterType.LogicalOperator, 'NOT'>]: RequireOnlyOne<
      AttributeFilterOptions<PrimaryKey, Entity> &
        RecursiveFilterOptions<PrimaryKey, Entity>
    >;
  } &
  // require attribute filter
  AttributeFilterOptions<PrimaryKey, Entity>;

export type FilterOptions<PrimaryKey, Entity> = RequireOnlyOne<
  RecursiveFilterOptions<PrimaryKey, Entity>
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
  ) {
    //TODO: add filter impl
  }
}
