import {Attribute, Entity} from '@typedorm/common';
import {testTable} from '../../__mocks__/test-table';

class BaseEvent {
  @Attribute()
  id!: string;
  @Attribute()
  sortKey!: number;
}

@Entity({
  name: 'SpecificEvent',
  table: testTable,
  primaryKey: {
    partitionKey: 'SpecificEvent___{{id}}',
    sortKey: {
      alias: 'sortKey',
    } as unknown as string,
  },
})
export class SpecificEvent extends BaseEvent {
  @Attribute()
  value!: number;
}
