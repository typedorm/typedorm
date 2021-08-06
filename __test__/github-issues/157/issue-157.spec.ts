// assuming there is a EMAIL_INDEX loaded before anything else
process.env.EMAIL_INDEX = 'email-index-v2';

import {testTable} from './test-table';
import {EntityManager} from '@typedorm/core';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import EntityData from './test-entity';
let entityManager: EntityManager;

const dcMock = {
  query: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [EntityData],
    table: testTable,
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('correctly queries matching items', async () => {
  dcMock.query.mockReturnValue({
    promise: () => ({
      Items: [
        {
          SK: 'root',
          stringSet: ['test'],
          email: 'test-entity@gmail.com',
          PK: 'entity#12345678',
          name: 'ABCD',
        },
      ],
    }),
  });

  const response = await entityManager.find(
    EntityData,
    'test-entity@gmail.com',
    {
      queryIndex: process.env.EMAIL_INDEX!,
      limit: 1,
    }
  );

  expect(dcMock.query).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#KY_CE_email': 'email',
    },
    ExpressionAttributeValues: {
      ':KY_CE_email': 'test-entity@gmail.com',
    },
    IndexName: 'email-index-v2',
    KeyConditionExpression: '#KY_CE_email = :KY_CE_email',
    Limit: 1,
    ScanIndexForward: true,
    TableName: 'user-v2',
  });

  const entityData = new EntityData();
  entityData.name = 'ABCD';
  (entityData as any).stringSet = ['test'];

  expect(response).toEqual({
    items: [entityData],
  });
});
