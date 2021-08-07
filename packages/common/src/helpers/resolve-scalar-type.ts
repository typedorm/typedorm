import {InvalidType} from './invalid-type';
import {ScalarType} from './scalar-type';

export type ResolveScalarType<T extends any> = T extends ScalarType
  ? T
  : T extends any[]
  ? T[0] extends ScalarType
    ? T[0]
    : InvalidType<[T[0], 'can not be resolved to a scalar type']>
  : InvalidType<[T, 'can not be resolved to a scalar type']>;
