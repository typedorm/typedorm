import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {TestEntity} from './test-entity';

let entityManager: EntityManager;

const dcMock = {
  update: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [TestEntity],
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('allows updating non-key attributes', async () => {
  dcMock.update.mockReturnValue({promise: () => ({})});

  const updateResponse = await entityManager.update(
    TestEntity,
    {
      id: '1',
      tenant: 'NEW_TENANT',
    },
    {
      foo: 'bar',
    }
  );

  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#UE_foo': 'foo',
    },
    ExpressionAttributeValues: {
      ':UE_foo': 'bar',
    },
    Key: {
      PK: 'USER#1#TENANT#NEW_TENANT',
      SK: 'USER#1#TENANT#NEW_TENANT',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression: 'SET #UE_foo = :UE_foo',
  });
  expect(updateResponse).toBeDefined();
});
