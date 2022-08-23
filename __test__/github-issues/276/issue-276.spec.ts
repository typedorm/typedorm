import 'reflect-metadata';
import {testTable} from './test-table';
import {Employee} from './employee-entity';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {NamePair} from './name-pair';

let entityManager: EntityManager;

const dcMock = {
  update: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [Employee],
    table: testTable,
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('allows updating product with attribute affecting primary key and index', async () => {
  dcMock.update.mockReturnValue({
    promise: () => ({}),
  });

  await entityManager.update<Employee>(
    Employee,
    {
      id: '#abcdef',
    },
    {
      Position: {
        SET: 'new-position',
      },
    },
    {
      where: {
        Names: {
          EQ: new NamePair('first', 'last'),
        },
      },
    }
  );

  // batch write is called with correctly transformed dynamo entity
  expect(dcMock.update).toHaveBeenCalledWith({
    ConditionExpression: '#CE_Names = :CE_Names',
    ExpressionAttributeNames: {
      '#CE_Names': 'Names',
      '#UE_Position': 'Position',
    },
    ExpressionAttributeValues: {
      ':CE_Names': 'first/last',
      ':UE_Position': 'new-position',
    },
    Key: {
      PK: 'employee##abcdef',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'product',
    UpdateExpression: 'SET #UE_Position = :UE_Position',
  });
});
