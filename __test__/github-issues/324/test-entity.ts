import {Attribute, Entity, INDEX_TYPE} from '@typedorm/common';
import {testTable} from '../../__mocks__/test-table';

@Entity({
  table: testTable,
  name: 'user',
  primaryKey: {
    partitionKey: 'pk',
    sortKey: 'sk',
  },
  indexes: {
    GSI1: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'pk',
      sortKey: 'sk',
    },
  },
})
export class TestEntity {
  @Attribute()
  pk: string;

  @Attribute()
  sk: string;

  @Attribute()
  foo: 'bar';
}
