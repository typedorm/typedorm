/* eslint-disable @typescript-eslint/no-namespace */
export namespace Condition {
  export type SimpleOperator = 'EQ' | 'LT' | 'LE' | 'GT' | 'GE';
  export type FunctionOperator = 'BEGINS_WITH';
  export type RangeOperator = 'BETWEEN';
}

export namespace Filter {
  export type SimpleOperator = Condition.SimpleOperator | 'NE';
}

export type SimpleOperator = Condition.SimpleOperator | Filter.SimpleOperator;
