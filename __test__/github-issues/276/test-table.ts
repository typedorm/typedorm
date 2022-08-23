import {Table} from '@typedorm/common';

export const testTable = new Table({
  name: 'product',
  partitionKey: 'PK',
});
