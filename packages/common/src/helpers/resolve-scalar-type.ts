import {InvalidType} from './invalid-type';
import {ScalarType} from './scalar-type';
import {IScalarTypeProvider} from './scalar-type-provider';

export type ResolveScalarType<T extends any> = T extends
  | ScalarType
  | IScalarTypeProvider
  ? T
  : T extends any[]
  ? T[0] extends ScalarType | IScalarTypeProvider
    ? T[0]
    : InvalidType<[T[0], 'can not be resolved to a scalar type']>
  : InvalidType<[T, 'can not be resolved to a scalar type']>;
