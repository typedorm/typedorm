import {ScalarType} from './scalar-type';

export interface ITransformable {
  toDynamoDB: () => ScalarType;
}
