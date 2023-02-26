import 'reflect-metadata';
import {testTable} from './test-table';
import {ProductEntity} from './specific-event-entity';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';

jest.useFakeTimers().setSystemTime(new Date('2020-10-10'));

let entityManager: EntityManager;

const dcMock = {
  update: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [ProductEntity],
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

  await entityManager.update<ProductEntity>(
    ProductEntity,
    {
      id: '1',
    },
    {
      id: '1',
      eventId: 'event-1',
    }
  );

  // batch write is called with correctly transformed dynamo entity
  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#UE_GSI1PK': 'GSI1PK',
      '#UE_GSI1SK': 'GSI1SK',
      '#UE_eventId': 'eventId',
      '#UE_id': 'id',
    },
    ExpressionAttributeValues: {
      ':UE_GSI1PK': 'EVT#event-1',
      ':UE_GSI1SK': 'PRD#1',
      ':UE_eventId': 'event-1',
      ':UE_id': '1',
    },
    Key: {
      PK: 'ID#1',
      SK: 'PRD',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'product',
    UpdateExpression:
      'SET #UE_id = :UE_id, #UE_eventId = :UE_eventId, #UE_GSI1SK = :UE_GSI1SK, #UE_GSI1PK = :UE_GSI1PK',
  });
});
