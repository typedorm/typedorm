import {Attribute, Entity, INDEX_TYPE} from '@typedorm/common';
import {Type} from 'class-transformer';
import {table} from './table';

export interface UserPrimaryKey {
  id: string;
}

export interface UserGSI1 {
  status: string;
  name?: string;
}

export class Car {
  maker: string;
  model: string;
}

@Entity({
  table,
  name: 'user',
  primaryKey: {
    partitionKey: 'USER#{{id}}',
    sortKey: 'USER#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: 'USER#STATUS#{{status}}',
      sortKey: 'USER#{{name}}',
      type: INDEX_TYPE.GSI,
      isSparse: false,
    },
  },
})
export class User implements UserPrimaryKey, UserGSI1 {
  @Attribute()
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  status: string;

  @Attribute()
  age: number;

  @Attribute()
  addresses: string[];

  @Attribute()
  @Type(() => Set<string>)
  roles: Set<string>;

  @Attribute()
  @Type(() => Car)
  car: Car;
}
