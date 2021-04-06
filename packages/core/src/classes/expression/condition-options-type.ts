import {
  NonKeyAttributes,
  RequireOnlyOne,
  ConditionType,
  ScalarType,
  ATTRIBUTE_TYPE,
  RequireAtLeastOne,
} from '@typedorm/common';

type AttributeConditionOptions<PrimaryKey, Entity> =
  | NonKeyAttributes<
      PrimaryKey,
      Entity,
      RequireOnlyOne<
        // if condition is one of the below, value must be of scalar type
        {
          [key in
            | ConditionType.SimpleOperator
            | Extract<
                ConditionType.FunctionOperator,
                'CONTAINS' | 'BEGINS_WITH'
              >]: ScalarType;
        } &
          // if between operator, value must be an array of two items
          {
            [key in Extract<ConditionType.RangeOperator, 'BETWEEN'>]: [
              ScalarType,
              ScalarType
            ];
          } &
          // for 'IN' operator value must be a list of scalar type
          {
            [key in Extract<ConditionType.RangeOperator, 'IN'>]: ScalarType[];
          } &
          // for 'ATTRIBUTE_TYPE' value must be one of the given enum values
          {
            [key in Extract<
              ConditionType.FunctionOperator,
              'ATTRIBUTE_TYPE'
            >]: ATTRIBUTE_TYPE;
          } &
          // for 'SIZE' operator value must be a map of comparator and as scalar value
          {
            [key in Extract<
              ConditionType.FunctionOperator,
              'SIZE'
            >]: RequireOnlyOne<
              {
                [key in ConditionType.SimpleOperator]: ScalarType;
              }
            >;
          }
      >
    >
  // for 'ATTRIBUTE_EXISTS' and 'ATTRIBUTE_NOT_EXISTS', key can be higher level attribute or a path to nested attribute
  | NonKeyAttributes<
      PrimaryKey,
      Entity,
      Extract<
        ConditionType.FunctionOperator,
        'ATTRIBUTE_EXISTS' | 'ATTRIBUTE_NOT_EXISTS'
      >
    >;

type RecursiveConditionOptions<PrimaryKey, Entity> = {
  // for `AND` and `OR` logical operators require at least one of defined options or other self
  [key in Extract<
    ConditionType.LogicalOperator,
    'OR' | 'AND'
  >]: RequireAtLeastOne<
    AttributeConditionOptions<PrimaryKey, Entity> &
      RecursiveConditionOptions<PrimaryKey, Entity>
  >;
} &
  // for `NOT` logical operators require one from defined options or other self
  {
    [key in Extract<ConditionType.LogicalOperator, 'NOT'>]: RequireOnlyOne<
      AttributeConditionOptions<PrimaryKey, Entity> &
        RecursiveConditionOptions<PrimaryKey, Entity>
    >;
  } &
  // require attribute filter
  AttributeConditionOptions<PrimaryKey, Entity>;

export type ConditionOptions<PrimaryKey, Entity> = RequireOnlyOne<
  RecursiveConditionOptions<PrimaryKey, Entity>
>;
