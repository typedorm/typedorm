import {UserPrimaryKey} from '../../../../__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {WriteTransaction} from '../../transaction/write-transaction';
import {TransactionManager} from '../transaction-manager';
import {User} from '../../../../__mocks__/user';

let manager: TransactionManager;
const dcMock = {
  transactWrite: jest.fn(),
};

let connection: Connection;
beforeEach(() => {
  connection = createTestConnection({
    entities: [User],
    documentClient: dcMock,
  });
  manager = new TransactionManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group write
 */
test('performs write transactions', async () => {
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
    .chian({
      create: {
        item: user,
      },
    })
    .chian<UserPrimaryKey, User>({
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
    .chian({
      create: {
        item: newUser,
      },
    });

  const response = await manager.write(transaction);

  expect(dcMock.transactWrite).toHaveBeenCalledTimes(1);
  expect(dcMock.transactWrite).toHaveBeenCalledWith({
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
          ConditionExpression: 'attribute_not_exists(#CE_PK)',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
          },
        },
      },
      {
        Update: {
          ExpressionAttributeNames: {
            '#attr0': 'status',
            '#attr1': 'GSI1PK',
          },
          ExpressionAttributeValues: {
            ':val0': 'active',
            ':val1': 'USER#STATUS#active',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          ReturnValues: 'ALL_NEW',
          TableName: 'test-table',
          UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
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
          ConditionExpression: 'attribute_not_exists(#CE_PK)',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
          },
        },
      },
    ],
  });
  expect(response).toEqual({
    ConsumedCapacity: [{}],
    ItemCollectionMetrics: [{}],
  });
});
