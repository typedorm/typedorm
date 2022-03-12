import {Attribute, Entity, INDEX_TYPE} from '@typedorm/common';
import {testTable} from '../../__mocks__/test-table';

@Entity({
  table: testTable,
  name: 'user',
  primaryKey: {
    partitionKey: 'USER#{{id}}#TENANT#{{tenant}}',
    sortKey: 'USER#{{id}}#TENANT#{{tenant}}',
  },
  indexes: {
    GSI1: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'USER#TENANT#{{tenant}}#STATUS#{{status}}',
      sortKey: 'USER#TENANT#{{tenant}}#STATUS#{{status}}',
    },
  },
})
export class TestEntity {
  @Attribute()
  id: string;

  @Attribute()
  tenant: string;

  @Attribute()
  status: boolean;

  @Attribute()
  foo: 'bar';
}
