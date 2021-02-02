import {ScalarType} from '@typedorm/common';

export const isScalarType = (item: any): item is ScalarType =>
  item &&
  (typeof item === 'string' ||
    typeof item === 'number' ||
    typeof item === 'boolean' ||
    Buffer.isBuffer(item));
