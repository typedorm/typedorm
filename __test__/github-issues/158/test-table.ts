import {Table, INDEX_TYPE} from '@typedorm/common';

export const testTable = new Table({
  name: 'user-v2',
  partitionKey: 'PK',
  sortKey: 'SK',
  indexes: {
    [process.env.EMAIL_INDEX!]: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'email',
      sortKey: 'sk',
    },
  },
});
