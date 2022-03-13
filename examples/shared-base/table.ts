import {Table} from '@typedorm/common';

export const myGlobalTable = new Table({
  name: 'example-table',
  partitionKey: 'PK',
  sortKey: 'SK',
});
