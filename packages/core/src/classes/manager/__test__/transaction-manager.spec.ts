import {UserPrimaryKey} from '../../../../__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {WriteTransaction} from '../../transaction/write-transaction';
import {TransactionManager} from '../transaction-manager';
import {User} from '../../../../__mocks__/user';
import {
  UserUniqueEmail,
  UserUniqueEmailPrimaryKey,
} from '@typedorm/core/__mocks__/user-unique-email';
import {Organisation} from '@typedorm/core/__mocks__/organisation';
import {ReadTransaction} from '../../transaction/read-transaction';
import {CONSUMED_CAPACITY_TYPE} from '@typedorm/common';

let manager: TransactionManager;
const dcMock = {
  transactWrite: jest.fn(),
  transactGet: jest.fn(),
};

let connection: Connection;
beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail, Organisation],
    documentClient: dcMock,
  });
  manager = new TransactionManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group write (legacy)
 */
test('performs write transactions for simple writes', async () => {
  dcMock.transactWrite.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      ConsumedCapacity: [{}],
      ItemCollectionMetrics: [{}],
    }),
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const user = new User();
  user.id = '1';
  user.name = 'user name';
  user.status = 'inactive';

  const newUser = new User();
  newUser.id = '2';
  newUser.name = 'user 2';
  newUser.status = 'inactive';

  const transaction = new WriteTransaction(connection)
    .addCreateItem(user)
    .chian<User, UserPrimaryKey>({
      update: {
        item: User,
        primaryKey: {
          id: '1',
        },
        body: {
          status: 'active',
        },
      },
    })
    .add([
      {
        create: {
          item: newUser,
        },
      },
    ]);

  const response = await manager.write(transaction, {
    returnConsumedCapacity: CONSUMED_CAPACITY_TYPE.TOTAL,
  });

  expect(dcMock.transactWrite).toHaveBeenCalledTimes(1);
  expect(dcMock.transactWrite).toHaveBeenCalledWith({
    ReturnConsumedCapacity: 'TOTAL',
    TransactItems: [
      {
        Put: {
          Item: {
            GSI1PK: 'USER#STATUS#inactive',
            GSI1SK: 'USER#user name',
            PK: 'USER#1',
            SK: 'USER#1',
            id: '1',
            __en: 'user',
            name: 'user name',
            status: 'inactive',
          },
          TableName: 'test-table',
          ConditionExpression:
            '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
            '#CE_SK': 'SK',
          },
        },
      },
      {
        Update: {
          ExpressionAttributeNames: {
            '#UE_status': 'status',
            '#UE_GSI1PK': 'GSI1PK',
          },
          ExpressionAttributeValues: {
            ':UE_status': 'active',
            ':UE_GSI1PK': 'USER#STATUS#active',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
          UpdateExpression:
            'SET #UE_status = :UE_status, #UE_GSI1PK = :UE_GSI1PK',
        },
      },
      {
        Put: {
          Item: {
            GSI1PK: 'USER#STATUS#inactive',
            GSI1SK: 'USER#user 2',
            PK: 'USER#2',
            SK: 'USER#2',
            id: '2',
            __en: 'user',
            name: 'user 2',
            status: 'inactive',
          },
          TableName: 'test-table',
          ConditionExpression:
            '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
            '#CE_SK': 'SK',
          },
        },
      },
    ],
  });
  expect(response).toEqual({
    success: true,
  });
});

test('performs write transactions for entities with unique attributes ', async () => {
  connection.entityManager.findOne = jest.fn().mockReturnValue({
    id: '1',
    email: 'olduser@example.com',
  });

  dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const transaction = new WriteTransaction(connection).chian<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >({
    update: {
      item: UserUniqueEmail,
      primaryKey: {
        id: '1',
      },
      body: {
        email: 'new@example.com',
        status: 'active',
      },
    },
  });

  await manager.write(transaction);

  expect(dcMock.transactWrite).toHaveBeenCalledTimes(1);
  expect(dcMock.transactWrite).toHaveBeenCalledWith({
    TransactItems: [
      {
        Update: {
          ExpressionAttributeNames: {
            '#UE_email': 'email',
            '#UE_status': 'status',
            '#UE_GSI1PK': 'GSI1PK',
          },
          ExpressionAttributeValues: {
            ':UE_email': 'new@example.com',
            ':UE_status': 'active',
            ':UE_GSI1PK': 'USER#STATUS#active',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
          UpdateExpression:
            'SET #UE_email = :UE_email, #UE_status = :UE_status, #UE_GSI1PK = :UE_GSI1PK',
        },
      },
      {
        Put: {
          ConditionExpression:
            '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
            '#CE_SK': 'SK',
          },
          Item: {
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@example.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@example.com',
          },
          TableName: 'test-table',
        },
      },
      {
        Delete: {
          Key: {
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#olduser@example.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#olduser@example.com',
          },
          TableName: 'test-table',
        },
      },
    ],
  });
});

test('performs write transactions for entities with non existing unique attributes ', async () => {
  connection.entityManager.findOne = jest.fn().mockReturnValue({
    id: '1',
    status: 'inactive',
  });

  dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const transaction = new WriteTransaction(connection).chian<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >({
    update: {
      item: UserUniqueEmail,
      primaryKey: {
        id: '1',
      },
      body: {
        email: 'new@example.com',
        status: 'active',
      },
    },
  });

  await manager.write(transaction);

  expect(dcMock.transactWrite).toHaveBeenCalledTimes(1);
  expect(dcMock.transactWrite).toHaveBeenCalledWith({
    TransactItems: [
      {
        Update: {
          ExpressionAttributeNames: {
            '#UE_email': 'email',
            '#UE_status': 'status',
            '#UE_GSI1PK': 'GSI1PK',
          },
          ExpressionAttributeValues: {
            ':UE_email': 'new@example.com',
            ':UE_status': 'active',
            ':UE_GSI1PK': 'USER#STATUS#active',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
          UpdateExpression:
            'SET #UE_email = :UE_email, #UE_status = :UE_status, #UE_GSI1PK = :UE_GSI1PK',
        },
      },
      {
        Put: {
          ConditionExpression:
            '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
            '#CE_SK': 'SK',
          },
          Item: {
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@example.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@example.com',
          },
          TableName: 'test-table',
        },
      },
    ],
  });
});

test('performs write transactions when removing entities with unique attributes ', async () => {
  connection.entityManager.findOne = jest.fn().mockReturnValue({
    id: '1',
    email: 'olduser@example.com',
  });

  dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const transaction = new WriteTransaction(connection).chian<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >({
    delete: {
      item: UserUniqueEmail,
      primaryKey: {
        id: '1',
      },
    },
  });

  await manager.write(transaction);

  expect(dcMock.transactWrite).toHaveBeenCalledTimes(1);
  expect(dcMock.transactWrite).toHaveBeenCalledWith({
    TransactItems: [
      {
        Delete: {
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
        },
      },
      {
        Delete: {
          Key: {
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#olduser@example.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#olduser@example.com',
          },
          TableName: 'test-table',
        },
      },
    ],
  });
});

test('performs write transactions when with mixed update actions ', async () => {
  dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const transaction = new WriteTransaction(connection).addUpdateItem<
    User,
    UserPrimaryKey
  >(
    User,
    {id: '1'},
    {
      addresses: {
        REMOVE: {
          $AT_INDEX: [1],
        },
      },
      name: {
        IF_NOT_EXISTS: {
          $PATH: 'updated',
          $VALUE: 'active',
        },
      },
    }
  );

  await manager.write(transaction);

  expect(dcMock.transactWrite).toHaveBeenCalledTimes(1);
  expect(dcMock.transactWrite).toHaveBeenCalledWith({
    TransactItems: [
      {
        Update: {
          ExpressionAttributeNames: {
            '#UE_addresses': 'addresses',
            '#UE_name': 'name',
            '#UE_updated': 'updated',
            '#UE_GSI1SK': 'GSI1SK',
          },
          ExpressionAttributeValues: {
            ':UE_GSI1SK': 'USER#active',
            ':UE_name': 'active',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
          UpdateExpression:
            'SET #UE_name = if_not_exists(#UE_updated, :UE_name), #UE_GSI1SK = :UE_GSI1SK REMOVE #UE_addresses[1]',
        },
      },
    ],
  });
});

/**
 * @group read
 */
test('reads items in a transaction', async () => {
  dcMock.transactGet.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      ConsumedCapacity: [{}],
      ItemCollectionMetrics: [{}],
    }),
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        Responses: [
          {
            Item: {
              GSI1PK: 'USER#STATUS#inactive',
              GSI1SK: 'USER#user name',
              PK: 'USER#1',
              SK: 'USER#1',
              id: '1',
              __en: 'user',
              name: 'user name',
              status: 'inactive',
            },
          },
          {
            Item: {
              GSI1PK: 'ORG#1#STATUS#inactive',
              GSI1SK: 'ORG#test-org#ACTIVE#active',
              GSI2PK: 'ORG#1#STATUS#inactive',
              GSI2SK: 'ORG#test-org#TEAM_COUNT#110',
              PK: 'ORG#1',
              SK: 'ORG#1',
              id: '1',
              __en: 'organisation',
              name: 'test-org',
              status: 'inactive',
              active: 'active',
              teamCount: 110,
            },
          },
        ],
      });
    }),
  });

  const readTransaction = new ReadTransaction().add([
    {
      get: {
        item: User,
        primaryKey: {
          id: 1,
        },
      },
    },
    {
      get: {
        item: Organisation,
        primaryKey: {
          id: 1,
        },
      },
    },
  ]);
  const response = await manager.read(readTransaction);
  expect(response).toEqual([
    {
      id: '1',
      name: 'user name',
      status: 'inactive',
    },
    {
      active: 'active',
      id: '1',
      name: 'test-org',
      status: 'inactive',
      teamCount: 110,
    },
  ]);
});

test('reads items in a transaction and parses them to original item properly when one of the item requested did not exist', async () => {
  dcMock.transactGet.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      ConsumedCapacity: [{}],
      ItemCollectionMetrics: [{}],
    }),
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        Responses: [
          {
            Item: null,
          },
          {
            Item: {},
          },
          {
            Item: {
              GSI1PK: 'ORG#1#STATUS#inactive',
              GSI1SK: 'ORG#test-org#ACTIVE#active',
              GSI2PK: 'ORG#1#STATUS#inactive',
              GSI2SK: 'ORG#test-org#TEAM_COUNT#110',
              PK: 'ORG#1',
              SK: 'ORG#1',
              id: '1',
              __en: 'organisation',
              name: 'test-org',
              status: 'inactive',
              active: 'active',
              teamCount: 110,
            },
          },
        ],
      });
    }),
  });

  const readTransaction = new ReadTransaction().add([
    {
      get: {
        item: User,
        primaryKey: {
          id: 1,
        },
      },
    },
    {
      get: {
        item: User,
        primaryKey: {
          id: 1,
        },
        options: {
          select: ['some.nonexistent.key'],
        },
      },
    },
    {
      get: {
        item: Organisation,
        primaryKey: {
          id: 1,
        },
      },
    },
  ]);
  const response = await manager.read(readTransaction);
  expect(response).toEqual([
    null,
    {},
    {
      active: 'active',
      id: '1',
      name: 'test-org',
      status: 'inactive',
      teamCount: 110,
    },
  ]);
});
