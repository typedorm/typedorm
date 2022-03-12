import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {BatchManager, EntityManager, WriteBatch} from '@typedorm/core';
import {SpecificEvent} from './specific-event-entity';
import {QUERY_ORDER} from '@typedorm/common';

let entityManager: EntityManager;
let batchManager: BatchManager;

const dcMock = {
  query: jest.fn(),
  batchWrite: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [SpecificEvent],
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
  batchManager = new BatchManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('correctly create event record using batch manager', async () => {
  dcMock.batchWrite.mockReturnValue({
    promise: () => ({}),
  });

  // when trying write entity of type specific event
  const event = new SpecificEvent();
  event.id = '100ConditionId';
  event.sortKey = 1622529932772;
  event.value = 6.831363201141357;

  await batchManager.write(
    new WriteBatch().addCreateItem<SpecificEvent>(event)
  );

  // batch write is called with correctly transformed dynamo entity
  expect(dcMock.batchWrite).toHaveBeenCalledWith({
    RequestItems: {
      'test-table': [
        {
          PutRequest: {
            Item: {
              PK: 'SpecificEvent___100ConditionId',
              SK: 1622529932772,
              __en: 'SpecificEvent',
              id: '100ConditionId',
              sortKey: 1622529932772,
              value: 6.831363201141357,
            },
          },
        },
      ],
    },
  });
});

test('correctly finds event record by id', async () => {
  dcMock.query.mockReturnValue({
    promise: () => ({
      Items: [
        {
          PK: 'SpecificEvent___100ConditionId',
          SK: 1622529932772,
          __en: 'SpecificEvent',
          id: '100ConditionId',
          sortKey: 1622529932772,
          value: 6.831363201141357,
        },
      ],
    }),
  });

  // when trying to find an entity by its id
  const response = await entityManager.find(
    SpecificEvent,
    {
      id: '100ConditionId',
    },
    {
      limit: 10,
      orderBy: QUERY_ORDER.DESC,
    }
  );

  // items are returned in correctly transformed form
  expect(response).toEqual({
    items: [
      {
        id: '100ConditionId',
        sortKey: 1622529932772,
        value: 6.831363201141357,
      },
    ],
  });
  expect(response.items[0]).toBeInstanceOf(SpecificEvent);
});
