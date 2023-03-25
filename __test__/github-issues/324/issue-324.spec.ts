import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {TestEntity} from './test-entity';

let entityManager: EntityManager;

const dcMock = {
  query: jest.fn(),
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

test('allows querying items with only partition key', async () => {
  dcMock.query.mockReturnValue({promise: () => ({})});

  await entityManager.find(TestEntity, {
    pk: 'onlyPK',
  });

  expect(dcMock.query).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'pk',
    },
    KeyConditionExpression: '#KY_CE_PK = :KY_CE_PK',
    TableName: 'test-table',
  });
});

test('allows querying items with PK and SK', async () => {
  dcMock.query.mockReturnValue({promise: () => ({})});

  await entityManager.find(
    TestEntity,
    {
      pk: 'withPK',
    },
    {
      keyCondition: {
        EQ: 'withSK',
      },
    }
  );

  expect(dcMock.query).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#KY_CE_SK': 'SK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'pk',
      ':KY_CE_SK': 'withSK',
    },
    KeyConditionExpression:
      '(#KY_CE_PK = :KY_CE_PK) AND (#KY_CE_SK = :KY_CE_SK)',
    TableName: 'test-table',
  });
});
