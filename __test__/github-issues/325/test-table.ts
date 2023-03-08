import {Table} from '@typedorm/common';

export const testTable = new Table({
  name: 'test-table',
  partitionKey: 'PK',
});
