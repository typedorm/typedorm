import {Replace} from '@typedorm/common';
import {User} from '@typedorm/core/__mocks__/user';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {WriteBatch} from '../../batch/write-batch';
import {Connection} from '../../connection/connection';
import {BatchManager} from '../batch-manager';
import {EntityManager} from '../entity-manager';
import {TransactionManager} from '../transaction-manager';

let connection: Connection;
let manager: BatchManager;
let entityManager: Replace<
  EntityManager,
  'findOne',
  {findOne: jest.SpyInstance}
>;
let transactionManager: Replace<
  TransactionManager,
  'write',
  {
    write: jest.SpyInstance;
  }
>;
const documentClientMock = {
  batchWrite: jest.fn(),
};
let originalPromiseAll: jasmine.Spy;

beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail],
    documentClient: documentClientMock,
  });

  manager = new BatchManager(connection);
  entityManager = connection.entityManager as any;
  transactionManager = connection.transactionManger as any;
  entityManager;
  entityManager.findOne = jest.fn();
  transactionManager.write = jest.fn();
  originalPromiseAll = spyOn(Promise, 'all').and.callThrough();
});

afterEach(() => {
  resetTestConnection();
});

test('processes empty batch write request', async () => {
  const writeBatch = new WriteBatch();

  const result = await manager.write(writeBatch);

  expect(originalPromiseAll).toHaveBeenCalledTimes(1);
  expect(originalPromiseAll.calls.mostRecent).toEqual(expect.any(Function));
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

  const largeBatchOfUsers = mockSimpleBatchData(60);
  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(1);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(3);
  expect(entityManager.findOne).not.toHaveBeenCalled();
  expect(transactionManager.write).not.toHaveBeenCalled();
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

  const largeBatchOfUsers = mockSimpleBatchData(120);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(4);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(10);
  expect(entityManager.findOne).not.toHaveBeenCalled();
  expect(transactionManager.write).not.toHaveBeenCalled();
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

  transactionManager.write.mockImplementation(() => {
    return {};
  });

  const largeBatchOfUsers = mockTransactionAndBatchData(114);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(4);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(6);
  expect(entityManager.findOne).toHaveBeenCalled();
  expect(transactionManager.write).toHaveBeenCalled();

  expect(result).toEqual({
    failedItems: [],
    unprocessedItems: [],
  });
});

test('processes batch write requests where some of the items failed to put', async () => {
  // mock document client with data
  randomlyRejectDataMock();

  entityManager.findOne.mockImplementation(() => {
    // 4 of the requests will receive this error
    throw new Error('Item not found  or whatever');
  });

  transactionManager.write.mockImplementation(() => {
    return {};
  });

  const largeBatchOfUsers = mockTransactionAndBatchData(20);

  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const result = await manager.write(writeBatch);
  expect(originalPromiseAll).toHaveBeenCalledTimes(3);
  expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(3);
  expect(entityManager.findOne).toHaveBeenCalled();
  expect(transactionManager.write).toHaveBeenCalled();

  expect(result).toEqual({
    failedItems: [
      {
        delete: {
          item: UserUniqueEmail,
          primaryKey: {
            id: 12,
          },
        },
      },
      {
        delete: {
          item: UserUniqueEmail,
          primaryKey: {
            id: 15,
          },
        },
      },
      {
        delete: {
          item: UserUniqueEmail,
          primaryKey: {
            id: 18,
          },
        },
      },
    ],
    unprocessedItems: [],
  });
});

//////////////////////////////////////////////////////////////
/////////////////////// mock helpers /////////////////////////
//////////////////////////////////////////////////////////////
function mockSimpleBatchData(items: number) {
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
