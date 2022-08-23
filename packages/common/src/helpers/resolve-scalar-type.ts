import {InvalidType} from './invalid-type';
import {ScalarType} from './scalar-type';
import {ITransformable} from './transformable';

export type ResolveScalarType<T extends any> = T extends
  | ScalarType
  | ITransformable
  ? T
  : T extends any[]
  ? T[0] extends ScalarType | ITransformable
    ? T[0]
    : InvalidType<[T[0], 'can not be resolved to a scalar type']>
  : InvalidType<[T, 'can not be resolved to a scalar type']>;
