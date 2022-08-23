import {
  ITransformable,
  KeyConditionType,
  RequireOnlyOne,
  ScalarType,
} from '@typedorm/common';

export type KeyConditionOptions = RequireOnlyOne<
  {
    [key in KeyConditionType.SimpleOperator]: ScalarType | ITransformable;
  } & {
    [key in KeyConditionType.FunctionOperator]: ScalarType | ITransformable;
  } & {
    [key in KeyConditionType.RangeOperator]: [
      ScalarType | ITransformable,
      ScalarType | ITransformable
    ];
  }
>;
