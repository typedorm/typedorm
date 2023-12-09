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
  dcMock.query.mockReset();
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

test('Example case where limit performs a full partition scan - finds desired count - does not exhaust partition', async () => {
  const mockUndesiredValue = {
    promise: () => ({
      Items: [],
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };

  const mockDesiredvalue = {
    promise: () => ({
      Items: [
        {
          pk: 'a_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };

  const lastItem = {
    promise: () => ({
      Items: [
        {
          pk: 'another_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
    }),
  };

  dcMock.query.mockReturnValueOnce(mockDesiredvalue);
  for (let i = 0; i < 100; i++) {
    dcMock.query.mockReturnValueOnce(mockUndesiredValue);
  }
  dcMock.query.mockReturnValueOnce(mockDesiredvalue);

  const response = await entityManager.find(
    TestEntity,
    {
      pk: 'a_pk',
    },
    {
      limit: 2,
    }
  );

  expect(dcMock.query).toHaveBeenCalledTimes(102);

  expect(response.items).toHaveLength(2);
});

test('Example case where limit performs a full partition scan - exhausts partition without reaching limit', async () => {
  const mockUndesiredValue = {
    promise: () => ({
      Items: [],
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };

  const mockDesiredvalue = {
    promise: () => ({
      Items: [
        {
          pk: 'a_pk',
          sk: 1,
          __en: 'TestEntity',
        },
      ],
      LastEvaluatedKey: {
        partitionKey: 'a_pk',
        sk: 1,
      },
    }),
  };

  const lastItem = {
    promise: () => ({
      Items: [],
    }),
  };

  dcMock.query.mockReturnValueOnce(mockDesiredvalue);
  for (let i = 0; i < 100; i++) {
    dcMock.query.mockReturnValueOnce(mockUndesiredValue);
  }
  dcMock.query.mockReturnValueOnce(mockDesiredvalue);

  for (let i = 0; i < 500; i++) {
    dcMock.query.mockReturnValueOnce(mockUndesiredValue);
  }

  dcMock.query.mockReturnValueOnce(lastItem);

  const response = await entityManager.find(
    TestEntity,
    {
      pk: 'a_pk',
    },
    {
      limit: 3,
    }
  );

  expect(dcMock.query).toHaveBeenCalledTimes(603);
  expect(response.items).toHaveLength(2);
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
