import {ITransformable} from './transformable';

export const isSerializableToScalarType = (item: any): item is ITransformable =>
  'toDynamoDB' in item;
