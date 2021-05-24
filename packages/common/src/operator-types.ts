/* eslint-disable @typescript-eslint/no-namespace */

export enum ATTRIBUTE_TYPE {
  STRING = 'S',
  STRING_SET = 'SS',
  NUMBER = 'N',
  NUMBER_SET = 'NS',
  BINARY = 'B',
  BINARY_SET = 'BS',
  BOOLEAN = 'BOOL',
  NULL = 'Null',
  LIST = 'L',
  MAP = 'M',
}

export type ArithmeticOperator = 'ADD' | 'SUB' | 'MPY' | 'DIV';
/**
 * This is the single place where all the the document client supported
 * operators are listed
 *
 *
 */

export namespace KeyConditionType {
  export type SimpleOperator = 'EQ' | 'LT' | 'LE' | 'GT' | 'GE';
  export type FunctionOperator = 'BEGINS_WITH';
  export type RangeOperator = 'BETWEEN';
}

export namespace ConditionType {
  export type SimpleOperator = KeyConditionType.SimpleOperator | 'NE';
  export type FunctionOperator =
    | KeyConditionType.FunctionOperator
    | 'ATTRIBUTE_TYPE'
    | 'CONTAINS'
    | 'SIZE'
    | 'ATTRIBUTE_EXISTS'
    | 'ATTRIBUTE_NOT_EXISTS';
  export type RangeOperator = KeyConditionType.RangeOperator | 'IN';
  export type LogicalOperator = 'AND' | 'OR' | 'NOT';
}

export namespace FilterType {
  export type SimpleOperator = ConditionType.SimpleOperator;
  export type FunctionOperator = ConditionType.FunctionOperator;
  export type RangeOperator = ConditionType.RangeOperator;
  export type LogicalOperator = ConditionType.LogicalOperator;
}

export type SimpleOperator =
  | KeyConditionType.SimpleOperator
  | ConditionType.SimpleOperator
  | FilterType.SimpleOperator;

export type RangeOperator =
  | KeyConditionType.RangeOperator
  | ConditionType.RangeOperator
  | FilterType.RangeOperator;
