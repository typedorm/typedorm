import {
  ATTRIBUTE_TYPE,
  FilterType,
  NonKeyAttributes,
  RequireAtLeastOne,
  RequireOnlyOne,
  ScalarType,
} from '@typedorm/common';

type AttributeFilterOptions<PrimaryKey, Entity> =
  // Require max 1 operator on non key attribute
  | NonKeyAttributes<
      PrimaryKey,
      Entity,
      RequireOnlyOne<
        {
          [key in
            | FilterType.SimpleOperator
            | Extract<
                FilterType.FunctionOperator,
                'CONTAINS' | 'BEGINS_WITH'
              >]: ScalarType;
        } &
          {
            [key in Extract<FilterType.RangeOperator, 'BETWEEN'>]: [
              ScalarType,
              ScalarType
            ];
          } &
          {
            [key in Extract<FilterType.RangeOperator, 'IN'>]: ScalarType[];
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
