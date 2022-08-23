import {ScalarType} from './scalar-type';

export interface IScalarTypeProvider {
  toDynamoDB: () => ScalarType;
}
