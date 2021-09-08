import {ScalarType} from '@typedorm/common';

export const isScalarType = (item: any): item is ScalarType =>
  typeof item === 'string' ||
  (typeof item === 'number' && !isNaN(item)) ||
  typeof item === 'boolean' ||
  Buffer.isBuffer(item);

export const isScalarTypeProvider = (item: any): item is () => ScalarType =>
  item && typeof item === 'function';
