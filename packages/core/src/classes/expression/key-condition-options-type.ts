import {KeyConditionType, RequireOnlyOne, ScalarType} from '@typedorm/common';

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
