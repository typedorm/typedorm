import {
  Attribute,
  Entity,
  TransformFromDynamo,
  TransformToDynamo,
} from '@typedorm/common';
import {Type} from 'class-transformer';
import {NamePair} from './name-pair';

@Entity({
  name: 'Employee',
  primaryKey: {
    partitionKey: 'employee#{{id}}',
  },
})
export class Employee {
  @Attribute()
  id: string;

  @Type(() => NamePair)
  @TransformToDynamo(({value}: {value: NamePair}) => value.toDynamoDB())
  @TransformFromDynamo(({value}: {value: string}) =>
    NamePair.fromDynamoDB(value)
  )
  Names: NamePair;

  @Attribute()
  Position: string;
}
