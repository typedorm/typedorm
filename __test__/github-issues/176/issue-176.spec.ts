import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {
  AutoGenerateAttributeValue,
  BatchManager,
  WriteBatch,
} from '@typedorm/core';
import {User} from './user-entity';

jest.mock('uuid', () => {
  const originalUUID = jest.requireActual('uuid');
  return {
    ...originalUUID,
    v4: jest
      .fn()
      .mockImplementationOnce(() => '763bd269-e0fa-409d-97ac-9b64c550746b')
      .mockImplementationOnce(() => '9cd91838-7ffa-4c3d-9b5a-0b44430c55df')
      .mockImplementation(originalUUID.v4),
  };
});

let batchManager: BatchManager;

const dcMock = {
  query: jest.fn(),
  batchWrite: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [User],
    documentClient: dcMock,
  });
  batchManager = new BatchManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('correctly create event record using batch manager', async () => {
  dcMock.batchWrite.mockReturnValue({
    promise: () => ({}),
  });

  const user1 = new User();
  user1.id = AutoGenerateAttributeValue.UUID4;
  user1.name = 'USER 1';

  const user2 = new User();
  user2.id = AutoGenerateAttributeValue.UUID4;
  user2.name = 'USER 2';

  const batch = new WriteBatch().addCreateItem(user1).addCreateItem(user2);

  await batchManager.write(batch);

  // batch write is called with correctly transformed dynamo entity
  expect(dcMock.batchWrite).toHaveBeenCalledWith({
    RequestItems: {
      'test-table': [
        {
          PutRequest: {
            Item: {
              PK: 'ID#763bd269-e0fa-409d-97ac-9b64c550746b',
              SK: 'ID#763bd269-e0fa-409d-97ac-9b64c550746b',
              __en: 'User',
              id: '763bd269-e0fa-409d-97ac-9b64c550746b',
              name: 'USER 1',
            },
          },
        },
        {
          PutRequest: {
            Item: {
              PK: 'ID#9cd91838-7ffa-4c3d-9b5a-0b44430c55df',
              SK: 'ID#9cd91838-7ffa-4c3d-9b5a-0b44430c55df',
              __en: 'User',
              id: '9cd91838-7ffa-4c3d-9b5a-0b44430c55df',
              name: 'USER 2',
            },
          },
        },
      ],
    },
    ReturnConsumedCapacity: undefined,
  });
});
