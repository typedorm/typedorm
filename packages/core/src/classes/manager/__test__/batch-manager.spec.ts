import {CONSUMED_CAPACITY_TYPE, Replace} from '@typedorm/common';
import {User} from '@typedorm/core/__mocks__/user';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {WriteBatch} from '../../batch/write-batch';
import {Connection} from '../../connection/connection';
import {BatchManager} from '../batch-manager';
import {EntityManager} from '../entity-manager';
import {TransactionManager} from '../transaction-manager';
import {ReadBatch} from '../../batch/read-batch';

let connection: Connection;
let manager: BatchManager;
let entityManager: Replace<
  EntityManager,
  'findOne',
  {findOne: jest.SpyInstance}
>;
let transactionManager: Replace<
  TransactionManager,
  'writeRaw',
  {
    writeRaw: jest.SpyInstance;
  }
>;
const documentClientMock = {
  batchWrite: jest.fn(),
  batchGet: jest.fn(),
};
let originalPromiseAll: jest.SpyInstance;

beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail],
    documentClient: documentClientMock,
  });

  manager = new BatchManager(connection);
  entityManager = connection.entityManager as any;
  transactionManager = connection.transactionManger as any;

  entityManager.findOne = jest.fn();
  transactionManager.writeRaw = jest.fn();
  originalPromiseAll = jest.spyOn(Promise, 'all');
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group write
 */
test('processes empty batch write request', async () => {
  const writeBatch = new WriteBatch();

  const result = await manager.write(writeBatch);

  expect(originalPromiseAll).toHaveBeenCalledTimes(1);
  expect(result).toEqual({
    failedItems: [],
    unprocessedItems: [],
  });
});

test('processes batch write request with simple request items', async () => {
  // mock document client with data
  documentClientMock.batchWrite.mockReturnValue({
    promise: () => ({UnprocessedItems: {}}),
  });

  const largeBatchOfUsers = mockSimpleBatchWriteData(60);
  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(
    writeBatch,
    {},
    {
      requestId: 'MY_UNIQUE_CUSTOM_REQUEST_ID',
    }
  );
  expect(originalPromiseAll).toHaveBeenCalledTimes(1);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(3);
  expect(entityManager.findOne).not.toHaveBeenCalled();
  expect(transactionManager.writeRaw).not.toHaveBeenCalled();
  expect(result).toEqual({
    failedItems: [],
    unprocessedItems: [],
  });
});

test('processes batch write request and retries as needed', async () => {
  // mock document client with data
  let counter = 0;
  documentClientMock.batchWrite.mockImplementation(({RequestItems}) => ({
    promise: () => {
      counter++;
      if (counter % 2 === 0) {
        return {
          UnprocessedItems: {},
        };
      } else {
        const tableName = Object.keys(RequestItems)[0];

        return {
          UnprocessedItems: {[tableName]: RequestItems[tableName]},
        };
      }
    },
  }));

  const largeBatchOfUsers = mockSimpleBatchWriteData(120);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(4);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(10);
  expect(entityManager.findOne).not.toHaveBeenCalled();
  expect(transactionManager.writeRaw).not.toHaveBeenCalled();
  expect(result).toEqual({
    failedItems: [],
    unprocessedItems: [],
  });
});

test('processes batch write requests that contains mix of unique and lazy load items', async () => {
  // mock document client with data
  randomlyRejectDataMock();

  entityManager.findOne.mockImplementation((en, primaryAttrs) => {
    return {
      ...primaryAttrs,
      email: 'test@example.com',
    };
  });

  transactionManager.writeRaw.mockImplementation(() => {
    return {};
  });

  const largeBatchOfUsers = mockTransactionAndBatchData(114);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(4);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(6);
  expect(entityManager.findOne).toHaveBeenCalled();
  expect(transactionManager.writeRaw).toHaveBeenCalled();

  expect(result).toEqual({
    failedItems: [],
    unprocessedItems: [],
  });
});

test('processes batch write requests where some of the items failed to put', async () => {
  documentClientMock.batchWrite
    .mockImplementationOnce(({RequestItems}) => ({
      promise: () => {
        const tableName = Object.keys(RequestItems)[0];
        return {
          UnprocessedItems: {
            [tableName]: (RequestItems[tableName] as any[]).slice(1),
          },
        };
      },
    }))
    .mockImplementationOnce(({RequestItems}) => ({
      promise: () => {
        const tableName = Object.keys(RequestItems)[0];
        return {
          UnprocessedItems: {
            [tableName]: (RequestItems[tableName] as any[]).slice(6),
          },
        };
      },
    }))
    .mockImplementationOnce(() => ({
      promise: () => {
        throw new Error();
      },
    }));

  const largeBatchOfUsers = mockSimpleBatchWriteData(10);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(3);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(3);

  expect(result).toEqual({
    failedItems: [
      {
        create: {
          item: {
            id: '8',
            name: 'User 8',
            status: 'active',
          },
        },
      },
      {
        delete: {
          item: User,
          primaryKey: {
            id: '3',
          },
        },
      },
      {
        create: {
          item: {
            id: '10',
            name: 'User 10',
            status: 'active',
          },
        },
      },
    ],
    unprocessedItems: [],
  });
});

test('processes batch write requests where some of the items could not be processed properly', async () => {
  let counter = 0;
  documentClientMock.batchWrite.mockImplementation(({RequestItems}) => ({
    promise: () => {
      ++counter;
      const tableName = Object.keys(RequestItems)[0];
      return {
        UnprocessedItems: {
          [tableName]: (RequestItems[tableName] as any[]).slice(
            // when on last counter return less items, makes it easy ti test
            counter === 10 ? 9 : 1
          ),
        },
      };
    },
  }));

  transactionManager.writeRaw.mockImplementation(() => {
    throw new Error();
  });

  // mock input data
  const uniqueEmailUser = new UserUniqueEmail();
  uniqueEmailUser.id = '11-22';
  uniqueEmailUser.status = 'active';
  uniqueEmailUser.name = 'User 11-2';
  uniqueEmailUser.email = 'user11-22.example.com';

  const largeBatchOfUsers = [
    ...mockSimpleBatchWriteData(20),
    {
      create: {
        item: uniqueEmailUser,
      },
    },
  ];

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(11);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(11);

  expect(result).toEqual({
    failedItems: [
      {
        create: {
          item: {
            email: 'user11-22.example.com',
            id: '11-22',
            name: 'User 11-2',
            status: 'active',
          },
        },
      },
    ],
    unprocessedItems: [
      {
        create: {
          item: {
            id: '20',
            name: 'User 20',
            status: 'active',
          },
        },
      },
    ],
  });
  // increase timeout, since there can be some delays due to backoff retries
}, 20000);

test('uses user defined retry attempts for write batch requests', async () => {
  documentClientMock.batchWrite.mockImplementation(({RequestItems}) => ({
    promise: () => {
      const tableName = Object.keys(RequestItems)[0];
      return {
        UnprocessedItems: {
          [tableName]: RequestItems[tableName] as any[],
        },
      };
    },
  }));

  const largeBatchOfUsers = mockSimpleBatchWriteData(10);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  await manager.write(writeBatch, {
    maxRetryAttempts: 2,
  });
  expect(originalPromiseAll).toHaveBeenCalledTimes(3);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(3); // 2 retries + 1 original request

  // increase timeout, since there can be some delays due to backoff retries
});

/**
 * @group read
 */

test('processes empty batch read request', async () => {
  const readBatch = new ReadBatch();
  const result = await manager.read(readBatch);

  expect(originalPromiseAll).toHaveBeenCalledTimes(1);
  expect(originalPromiseAll).toHaveBeenCalledWith([]);
  expect(documentClientMock.batchGet).toHaveBeenCalledTimes(0);

  expect(result).toEqual({failedItems: [], items: [], unprocessedItems: []});
});

test('processes simple batch read request', async () => {
  // mock response
  documentClientMock.batchGet.mockReturnValue({
    promise: () => ({
      Responses: {
        'simple-table': [
          {
            id: 1,
            name: 'test',
            __en: 'user',
            PK: 'USER#1',
            SK: 'USER#1',
            status: 'active',
          },
          {
            id: 2,
            name: 'test',
            __en: 'user',
            PK: 'USER#2',
            SK: 'USER#2',
            status: 'active',
          },
        ],
      },
    }),
  });

  const readTestBatch = new ReadBatch().add([
    {
      item: User,
      primaryKey: {
        id: 1,
      },
    },
    {
      item: User,
      primaryKey: {
        id: 2,
      },
    },
  ]);
  const response = await manager.read(
    readTestBatch,
    {},
    {
      returnConsumedCapacity: CONSUMED_CAPACITY_TYPE.TOTAL,
    }
  );

  expect(originalPromiseAll).toHaveBeenCalledTimes(1);
  expect(originalPromiseAll).toHaveBeenCalledWith([expect.any(Promise)]);
  expect(response).toEqual({
    failedItems: [],
    items: [
      {
        id: 1,
        name: 'test',
        status: 'active',
      },
      {
        id: 2,
        name: 'test',
        status: 'active',
      },
    ],
    unprocessedItems: [],
  });
});

test('processes batch read request with multiple calls', async () => {
  // mock document client to return random unprocessed items
  // when unprocessed items are returned, TypeDORM should auto retry until,
  // either max attempts is reached or all items have resolved
  let counter = 0;
  documentClientMock.batchGet.mockImplementation(() => ({
    promise: () => {
      counter++;

      // return success items for even requests
      if (counter % 2 === 0) {
        return {
          Responses: {
            'simple-table': [
              {
                id: 1,
                name: 'test',
                __en: 'user',
                PK: 'USER#1',
                SK: 'USER#1',
                status: 'active',
              },
            ],
            'test-table': [
              {
                id: 2,
                name: 'test',
                __en: 'user',
                PK: 'USER#2',
                SK: 'USER#2',
                status: 'active',
              },
            ],
          },
        };
      }

      return {
        Responses: {
          'simple-table': [
            {
              id: 4,
              name: 'test',
              __en: 'user',
              PK: 'USER#4',
              SK: 'USER#4',
              status: 'active',
            },
          ],
        },
        UnprocessedKeys: {
          'simple-table': {Keys: [{PK: 'USER#3', SK: 'USER#3'}]},
        },
      };
    },
  }));

  const readBatch = new ReadBatch().add(mockSimpleBatchReadData(117));
  const response = await manager.read(readBatch);

  expect(originalPromiseAll).toHaveBeenCalledTimes(3);
  expect(response).toEqual({
    failedItems: [],
    items: [
      {
        id: 4,
        name: 'test',
        status: 'active',
      },
      {
        id: 1,
        name: 'test',
        status: 'active',
      },
      {
        id: 2,
        name: 'test',
        status: 'active',
      },
      {
        id: 4,
        name: 'test',
        status: 'active',
      },
      {
        id: 1,
        name: 'test',
        status: 'active',
      },
      {
        id: 2,
        name: 'test',
        status: 'active',
      },
    ],
    unprocessedItems: [],
  });
  // increase time to allow retries to finish with backoff
}, 10000);

test('processes batch read request when some items failed to get', async () => {
  // mock document client to return error for some items,

  documentClientMock.batchGet
    .mockImplementationOnce(({RequestItems}) => ({
      promise: () => {
        const tableName = Object.keys(RequestItems)[0];
        const itemForCurrTable = RequestItems[tableName];
        return {
          Responses: {
            [tableName]: {
              id: 0,
              name: 'test',
              __en: 'user',
              PK: 'USER#0',
              SK: 'USER#0',
              status: 'active',
            },
          },
          UnprocessedKeys: {
            [tableName]: {Keys: itemForCurrTable.Keys.slice(1)},
          },
        };
      },
    }))
    .mockImplementationOnce(({RequestItems}) => ({
      promise: () => {
        const tableName = Object.keys(RequestItems)[0];
        const itemForCurrTable = RequestItems[tableName];

        return {
          Responses: {
            [tableName]: [
              {
                id: 1,
                name: 'test',
                __en: 'user',
                PK: 'USER#1',
                SK: 'USER#1',
                status: 'inactive',
              },
              {
                id: 2,
                name: 'test',
                __en: 'user',
                PK: 'USER#2',
                SK: 'USER#2',
                status: 'inactive',
              },
            ],
          },
          UnprocessedKeys: {
            [tableName]: {Keys: itemForCurrTable.Keys.slice(2)},
          },
        };
      },
    }))
    // thrown an error after third api to mock document client's throttling behavior
    .mockImplementationOnce(() => ({
      promise: () => {
        throw new Error();
      },
    }));

  // create mock batch
  const readBatch = new ReadBatch().add(mockSimpleBatchReadData(6));
  const response = await manager.read(readBatch);

  expect(documentClientMock.batchGet).toHaveReturnedTimes(3);
  expect(originalPromiseAll).toHaveBeenCalledTimes(3);
  expect(response).toEqual({
    failedItems: [
      {
        item: User,
        primaryKey: {
          id: '3',
        },
      },
      {
        item: User,
        primaryKey: {
          id: '4',
        },
      },
      {
        item: User,
        primaryKey: {
          id: '5',
        },
      },
    ],
    items: [
      {
        id: 0,
        name: 'test',
        status: 'active',
      },
      {
        id: 1,
        name: 'test',
        status: 'inactive',
      },
      {
        id: 2,
        name: 'test',
        status: 'inactive',
      },
    ],
    unprocessedItems: [],
  });
}, 10000);

test('processes batch read request and returns unprocessed items back to user', async () => {
  // mock document client to behave like one with very low read throughput,
  let index = -1;
  documentClientMock.batchGet.mockImplementation(({RequestItems}) => ({
    promise: () => {
      const tableName = Object.keys(RequestItems)[0];
      const itemForCurrTable = RequestItems[tableName];
      index++;
      return {
        Responses: {
          [tableName]: {
            id: index,
            name: 'test',
            __en: 'user',
            PK: `USER#${index}`,
            SK: `USER#${index}`,
            status: 'active',
          },
        },
        UnprocessedKeys: {
          // only process one item return others back
          [tableName]: {Keys: itemForCurrTable.Keys.slice(1)},
        },
      };
    },
  }));

  // create mock batch
  const readBatch = new ReadBatch().add(mockSimpleBatchReadData(13));
  const response = await manager.read(readBatch);

  expect(documentClientMock.batchGet).toHaveReturnedTimes(11);
  expect(originalPromiseAll).toHaveBeenCalledTimes(11);

  // Our mocked read batch api returns one item for each request,
  // util max read retry limit is reached, hence we get 1 initial + 10 items from retries
  expect(response.items.length).toEqual(11);
  expect(response.failedItems.length).toBeFalsy();
  expect(response.unprocessedItems).toEqual([
    {
      item: User,
      primaryKey: {
        id: '11',
      },
    },
    {
      item: User,
      primaryKey: {
        id: '12',
      },
    },
  ]);
}, 20000);

test('uses user defined retry attempts for read batch request', async () => {
  // mock document client to behave like one with very low read throughput,

  documentClientMock.batchGet.mockImplementation(({RequestItems}) => ({
    promise: () => {
      const tableName = Object.keys(RequestItems)[0];
      const itemForCurrTable = RequestItems[tableName];
      return {
        UnprocessedKeys: {
          // does not process any request
          [tableName]: itemForCurrTable,
        },
      };
    },
  }));

  // create mock batch
  const readBatch = new ReadBatch().add(mockSimpleBatchReadData(80));
  const response = await manager.read(readBatch, {
    maxRetryAttempts: 3,
  });

  expect(documentClientMock.batchGet).toHaveReturnedTimes(4);
  expect(originalPromiseAll).toHaveBeenCalledTimes(4);
  // no item is processed
  expect(response.unprocessedItems.length).toEqual(80);
}, 10000);

/**
 *
 *
 * MOCK HELPERS  used within this test suite
 *
 *
 */
function mockSimpleBatchWriteData(items: number) {
  let largeBatchOfUsers = Array(items).fill({});

  largeBatchOfUsers = largeBatchOfUsers.map((empty, index) => {
    const user = new User();
    user.id = (++index).toString();
    user.status = 'active';
    user.name = `User ${index}`;

    // randomize mock data with create and delete requests
    if (index % 2 === 0) {
      return {
        create: {
          item: user,
        },
      };
    } else {
      return {
        delete: {
          item: User,
          primaryKey: {
            id: '3',
          },
        },
      };
    }
  });

  return largeBatchOfUsers;
}

function mockSimpleBatchReadData(count: number) {
  const largeBatchOfUsers = Array(count).fill({});
  return largeBatchOfUsers.map((empty, index) => ({
    item: User,
    primaryKey: {
      id: index.toString(),
    },
  }));
}

function mockTransactionAndBatchData(items: number) {
  let currentIndex = 0;
  const largeBatchOfUsers = new Array(items).fill({});
  return largeBatchOfUsers.map((empty, index) => {
    if (currentIndex === 2) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }

    const user = new User();
    user.id = index.toString();
    user.status = 'active';
    user.name = `User ${index}`;

    const simpleItem = {
      create: {
        item: user,
      },
    };

    const lazyLoadedItem = {
      delete: {
        item: UserUniqueEmail,
        primaryKey: {
          id: index,
        },
      },
    };

    const uniqueEmailUser = new UserUniqueEmail();
    uniqueEmailUser.id = index.toString();
    uniqueEmailUser.status = 'active';
    uniqueEmailUser.name = `User ${index}`;
    uniqueEmailUser.email = `user${index}.example.com`;
    const transactionItems = {
      create: {
        item: uniqueEmailUser,
      },
    };

    const itemOptions = [simpleItem, lazyLoadedItem, transactionItems];

    // select of three items
    return itemOptions[currentIndex];
  });
}

function randomlyRejectDataMock() {
  let counter = 0;
  documentClientMock.batchWrite.mockImplementation(({RequestItems}) => ({
    promise: () => {
      counter++;
      if (counter % 3 === 0) {
        return {
          UnprocessedItems: {},
        };
      } else {
        const tableName = Object.keys(RequestItems)[0];
        return {
          UnprocessedItems: {[tableName]: RequestItems[tableName]},
        };
      }
    },
  }));
}
