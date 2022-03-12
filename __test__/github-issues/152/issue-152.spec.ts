import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {TestEntity} from './test-entity';

let entityManager: EntityManager;

const dcMock = {
  update: jest.fn(),
  get: jest.fn(),
  transactWrite: jest.fn(),
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

test('allows updating key only attributes', async () => {
  dcMock.update.mockReturnValue({promise: () => ({})});
  dcMock.get.mockReturnValue({promise: () => ({})});
  dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  await entityManager.update(
    TestEntity,
    {
      id: '1',
      tenant: 'NEW_TENANT',
    },
    {
      id: '2',
      tenant: 'NEW_TENANT',
      status: true,
    }
  );

  expect(dcMock.transactWrite).toHaveBeenCalledWith({
    TransactItems: [
      {
        Put: {
          Item: {
            GSI1PK: 'USER#TENANT#NEW_TENANT#STATUS#true',
            GSI1SK: 'USER#TENANT#NEW_TENANT#STATUS#true',
            PK: 'USER#2#TENANT#NEW_TENANT',
            SK: 'USER#2#TENANT#NEW_TENANT',
            id: '2',
            status: true,
            tenant: 'NEW_TENANT',
          },
          ReturnValues: 'ALL_NEW',
          TableName: 'test-table',
        },
      },
    ],
  });
});
