import {Table} from '@typedorm/common';
import {ExpressionBuilder} from '../../expression-builder';

test('builds unique record expression for table with simple key', () => {
  const simpleTable = new Table({
    name: 'simple-primary-key-table',
    partitionKey: 'PK',
  });
  const expression = new ExpressionBuilder().buildUniqueRecordConditionExpression(
    simpleTable
  );
  expect(expression).toEqual({
    ConditionExpression: 'attribute_not_exists(#CE_PK)',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
    },
  });
});

test('builds unique record expression for table with composite key', () => {
  const simpleTable = new Table({
    name: 'simple-primary-key-table',
    partitionKey: 'PK',
    sortKey: 'SK',
  });
  const expression = new ExpressionBuilder().buildUniqueRecordConditionExpression(
    simpleTable
  );
  expect(expression).toEqual({
    ConditionExpression:
      'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
  });
});
