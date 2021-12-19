import {Table, INDEX_TYPE} from '@typedorm/common';

export const testTable = new Table({
  name: 'article',
  partitionKey: 'PK',
  sortKey: 'SK',
  indexes: {
    GSI1: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI1PK',
      sortKey: 'GSI1SK',
    },
    GSI2: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI2PK',
      sortKey: 'GSI2SK',
    },
    GSI3: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI3PK',
      sortKey: 'GSI3SK',
    },
    GSI4: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI4PK',
      sortKey: 'GSI4SK',
    },
    GSI5: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI5PK',
      sortKey: 'GSI5SK',
    },
    LSI1: {
      type: INDEX_TYPE.LSI,
      sortKey: 'LSI1SK',
    },
    LSI2: {
      type: INDEX_TYPE.LSI,
      sortKey: 'LSI2SK',
    },
    LSI3: {
      type: INDEX_TYPE.LSI,
      sortKey: 'LSI3SK',
    },
    LSI4: {
      type: INDEX_TYPE.LSI,
      sortKey: 'LSI4SK',
    },
  },
});
