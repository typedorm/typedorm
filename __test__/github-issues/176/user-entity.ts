import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
} from '@typedorm/common';
import {testTable} from '../../__mocks__/test-table';

@Entity({
  name: 'User',
  table: testTable,
  primaryKey: {
    partitionKey: 'ID#{{id}}',
    sortKey: 'ID#{{id}}',
  },
})
export class User {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id!: string;

  @Attribute()
  name!: string;
}
