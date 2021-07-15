import {
  ATTRIBUTE_TYPE,
  FilterType,
  NonKeyAttributesWithReturnType,
  RequireAtLeastOne,
  RequireOnlyOne,
  ResolveScalarType,
} from '@typedorm/common';

type AttributeFilterOptions<Entity, PrimaryKey> =
  // Require max 1 operator on non key attribute
  | {
      [enKey in keyof Omit<Entity, keyof PrimaryKey>]?: RequireOnlyOne<
        {
          [key in
            | FilterType.SimpleOperator
            | Extract<
                FilterType.FunctionOperator,
                'CONTAINS' | 'BEGINS_WITH'
              >]: ResolveScalarType<Entity[enKey]>;
        } &
          {
            [key in Extract<FilterType.RangeOperator, 'BETWEEN'>]: [
              ResolveScalarType<Entity[enKey]>,
              ResolveScalarType<Entity[enKey]>
            ];
          } &
          {
            [key in Extract<FilterType.RangeOperator, 'IN'>]: ResolveScalarType<
              Entity[enKey]
            >[];
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
                [key in FilterType.SimpleOperator]: number;
              }
            >;
          }
      >;
    }
  // Require 'ATTRIBUTE_EXISTS' or 'ATTRIBUTE_NOT_EXISTS' on non key attribute
  | NonKeyAttributesWithReturnType<
      Entity,
      PrimaryKey,
      Extract<
        FilterType.FunctionOperator,
        'ATTRIBUTE_EXISTS' | 'ATTRIBUTE_NOT_EXISTS'
      >
    >;

type RecursiveFilterOptions<Entity, PrimaryKey> = {
  // for `AND` and `OR` logical operators require at least one of defined options or other self
  [key in Extract<FilterType.LogicalOperator, 'OR' | 'AND'>]: RequireAtLeastOne<
    AttributeFilterOptions<Entity, PrimaryKey> &
      // manually infer recursive type
      RecursiveFilterOptions<Entity, PrimaryKey> extends infer R
      ? R
      : never
  >;
} &
  // for `NOT` logical operators require one from defined options or other self
  {
    [key in Extract<FilterType.LogicalOperator, 'NOT'>]: RequireOnlyOne<
      AttributeFilterOptions<Entity, PrimaryKey> &
        // manually infer recursive type
        RecursiveFilterOptions<Entity, PrimaryKey> extends infer R
        ? R
        : never
    >;
  } &
  // require attribute filter
  AttributeFilterOptions<Entity, PrimaryKey>;

export type FilterOptions<Entity, PrimaryKey> = RequireOnlyOne<
  RecursiveFilterOptions<Entity, PrimaryKey>
>;
