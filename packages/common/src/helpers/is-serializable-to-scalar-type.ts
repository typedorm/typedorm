import {IScalarTypeProvider} from './scalar-type-provider';

export const isSerializableToScalarType = (
  item: any
): item is IScalarTypeProvider => 'toDynamoDB' in item;
