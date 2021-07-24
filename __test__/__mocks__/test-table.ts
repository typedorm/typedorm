import {Table, INDEX_TYPE} from '@typedorm/common';

export const testTable = new Table({
  name: 'test-table',
  partitionKey: 'PK',
  sortKey: 'SK',
  indexes: {
    GSI1: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI1PK',
      sortKey: 'GSI1SK',
    },
    LSI1: {
      type: INDEX_TYPE.LSI,
      sortKey: 'LSI1SK',
    },
  },
});
