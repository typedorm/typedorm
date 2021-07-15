import {
  NestedAttributes,
  RequireOnlyOne,
  ConditionType,
  ATTRIBUTE_TYPE,
  RequireAtLeastOne,
  ResolveScalarType,
} from '@typedorm/common';

type AttributeConditionOptions<Entity> =
  | {
      [enKey in keyof Entity]?: RequireOnlyOne<
        // if condition is one of the below, value must be of scalar type
        {
          [key in
            | ConditionType.SimpleOperator
            | Extract<
                ConditionType.FunctionOperator,
                'CONTAINS' | 'BEGINS_WITH'
              >]: ResolveScalarType<Entity[enKey]>;
        } &
          // if between operator, value must be an array of two items
          {
            [key in Extract<ConditionType.RangeOperator, 'BETWEEN'>]: [
              ResolveScalarType<Entity[enKey]>,
              ResolveScalarType<Entity[enKey]>
            ];
          } &
          // for 'IN' operator value must be a list of scalar type
          {
            [key in Extract<
              ConditionType.RangeOperator,
              'IN'
            >]: ResolveScalarType<Entity[enKey]>[];
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
                [key in ConditionType.SimpleOperator]: number;
              }
            >;
          }
      >;
    }
  // for 'ATTRIBUTE_EXISTS' and 'ATTRIBUTE_NOT_EXISTS', key can be higher level attribute or a path to nested attribute
  | NestedAttributes<
      Entity,
      Extract<
        ConditionType.FunctionOperator,
        'ATTRIBUTE_EXISTS' | 'ATTRIBUTE_NOT_EXISTS'
      >
    >;

type RecursiveConditionOptions<Entity> = {
  // for `AND` and `OR` logical operators require at least one of defined options or other self
  [key in Extract<
    ConditionType.LogicalOperator,
    'OR' | 'AND'
  >]: RequireAtLeastOne<
    AttributeConditionOptions<Entity> &
      // manually infer recursive type
      RecursiveConditionOptions<Entity> extends infer R
      ? R
      : never
  >;
} &
  // for `NOT` logical operators require one from defined options or other self
  {
    [key in Extract<ConditionType.LogicalOperator, 'NOT'>]: RequireOnlyOne<
      AttributeConditionOptions<Entity> &
        // manually infer recursive type
        RecursiveConditionOptions<Entity> extends infer R
        ? R
        : never
    >;
  } &
  // require attribute filter
  AttributeConditionOptions<Entity>;

export type ConditionOptions<Entity> = RequireOnlyOne<
  RecursiveConditionOptions<Entity>
>;
