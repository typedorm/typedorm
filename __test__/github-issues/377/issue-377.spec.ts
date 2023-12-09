import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {QUERY_ORDER} from '@typedorm/common';
import {TestEntity} from './test-entity';

let entityManager: EntityManager;

const dcMock = {
  query: jest.fn(),
  batchWrite: jest.fn(),
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

test('correctly uses default limit', async () => {
  dcMock.query.mockReturnValue({
    promise: () => ({
      Items: [
        {
          pk: 'a_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
      ConsumedCapacity: {
        TableName: 'my-table',
        CapacityUnits: 123.3,
      },
      ScannedCount: 10,
    }),
  });

  const response = await entityManager.find(
    TestEntity,
    {
      pk: 'a_pk',
    },
    {
      limit: 10,
      orderBy: QUERY_ORDER.DESC,
    }
  );

  expect(dcMock.query).toHaveBeenCalledTimes(1);

  expect(response).toEqual({
    items: [Object.assign(new TestEntity(), {pk: 'a_pk', sk: 1})],
  });
  expect(response.items[0]).toBeInstanceOf(TestEntity);
});

test('correctly uses ConsumedCapacity limit - stops querying after reaching capacityConsumed metaLimit', async () => {
  const mockReturnValue = {
    promise: () => ({
      Items: [
        {
          pk: 'a_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
      ConsumedCapacity: {
        TableName: 'my-table',
        CapacityUnits: 100.0,
      },
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };
  dcMock.query.mockReturnValueOnce(mockReturnValue);
  dcMock.query.mockReturnValueOnce(mockReturnValue);

  const response = await entityManager.find(
    TestEntity,
    {
      pk: 'a_pk',
    },
    {
      limit: 10,
      orderBy: QUERY_ORDER.DESC,
    },
    {},
    {metaLimit: 100, metaLimitType: 'capacityConsumed'}
  );

  // without capacityConsumed limit, query 3 times
  expect(dcMock.query).toHaveBeenCalledTimes(1);

  expect(response.items).toHaveLength(1);
});

test('correctly uses ConsumedCapacity limit - stops querying after reaching capacityConsumed metaLimit', async () => {
  const mockReturnValue = {
    promise: () => ({
      Items: [
        {
          pk: 'a_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
      ConsumedCapacity: {
        TableName: 'my-table',
        CapacityUnits: 100.0,
      },
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };
  dcMock.query.mockReturnValueOnce(mockReturnValue);
  dcMock.query.mockReturnValueOnce(mockReturnValue);
  dcMock.query.mockReturnValueOnce(mockReturnValue);

  const response = await entityManager.find(
    TestEntity,
    {
      pk: 'a_pk',
    },
    {
      limit: 10,
      orderBy: QUERY_ORDER.DESC,
    },
    {},
    {metaLimit: 200, metaLimitType: 'capacityConsumed'}
  );

  // without capacityConsumed limit, query 4 times
  expect(dcMock.query).toHaveBeenCalledTimes(2);

  expect(response.items).toHaveLength(2);
});

test('correctly uses ScannedCount limit - stops querying after reaching scannedCount metaLimit', async () => {
  const mockReturnValue = {
    promise: () => ({
      Items: [
        {
          pk: 'a_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
      ScannedCount: 10,
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };
  dcMock.query.mockReturnValueOnce(mockReturnValue);
  dcMock.query.mockReturnValueOnce(mockReturnValue);
  dcMock.query.mockReturnValueOnce(mockReturnValue);

  const response = await entityManager.find(
    TestEntity,
    {
      pk: 'a_pk',
    },
    {
      limit: 10,
      orderBy: QUERY_ORDER.DESC,
    },
    {},
    {metaLimit: 20, metaLimitType: 'scannedCount'}
  );

  // without scannedCount limit, query 4 times
  expect(dcMock.query).toHaveBeenCalledTimes(2);

  expect(response.items).toHaveLength(2);
});
