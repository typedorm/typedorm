export type FindKeySimpleOperator = 'EQ' | 'LE' | 'LT' | 'GE' | 'GT';

export type FindKeyScalarOperator = FindKeySimpleOperator | 'BEGINS_WITH';

export type FindKeyListOperator = 'BETWEEN';
