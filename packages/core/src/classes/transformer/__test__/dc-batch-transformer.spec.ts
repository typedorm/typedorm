import {Attribute, Entity, Table} from '@typedorm/common';
import {Organisation} from '@typedorm/core/__mocks__/organisation';
import {table} from '@typedorm/core/__mocks__/table';
import {User} from '@typedorm/core/__mocks__/user';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {WriteBatch} from '../../batch/write-batch';
import {Connection} from '../../connection/connection';
import {DocumentClientBatchTransformer} from '../document-client-batch-transformer';

let connection: Connection;
let dcBatchTransformer: DocumentClientBatchTransformer;
beforeEach(() => {
  connection = createTestConnection({
    entities: [User, Organisation, UserUniqueEmail],
    table,
  });
  dcBatchTransformer = new DocumentClientBatchTransformer(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('correctly extends low order transformers', () => {
  expect(dcBatchTransformer.connection).toEqual(connection);
});

/**
 * @group toDynamoWriteBatchItem
 */
test('transforms into batch write items', () => {
  const user1 = new User();
  user1.id = '1';
  user1.status = 'inactive';
  user1.name = 'user 1';

  const user2 = new UserUniqueEmail();
  user2.id = '2';
  user2.status = 'active';
  user2.name = 'user 2';
  user2.email = 'user@test.com';

  const writeBatch = new WriteBatch().add([
    // simple create item
    {
      create: {
        item: user1,
      },
    },
    // simple delete item
    {
      delete: {
        item: Organisation,
        primaryKey: {
          id: 'ORG_ID_1',
        },
      },
    },
    // delete item that has one ore more unique attributes
    {
      delete: {
        item: UserUniqueEmail,
        primaryKey: {
          id: '3',
        },
      },
    },
    // create item that has one or more unique attributes
    {
      create: {
        item: user2,
      },
    },
  ]);

  const transformed = dcBatchTransformer.toDynamoWriteBatchItems(writeBatch);

  expect(transformed).toEqual({
    // items that can be processed as batch items
    // each item in the list represents new bath requests
    batchWriteRequestMapItems: [
      {
        'test-table': [
          {
            rawInput: {
              create: {
                item: user1,
              },
            },
            transformedInput: {
              PutRequest: {
                Item: {
                  GSI1PK: 'USER#STATUS#inactive',
                  GSI1SK: 'USER#user 1',
                  PK: 'USER#1',
                  SK: 'USER#1',
                  __en: 'user',
                  id: '1',
                  name: 'user 1',
                  status: 'inactive',
                },
              },
            },
          },
          {
            rawInput: {
              delete: {
                item: Organisation,
                primaryKey: {
                  id: 'ORG_ID_1',
                },
              },
            },
            transformedInput: {
              DeleteRequest: {
                Key: {
                  PK: 'ORG#ORG_ID_1',
                  SK: 'ORG#ORG_ID_1',
                },
              },
            },
          },
        ],
      },
    ],
    lazyTransactionWriteItemListLoaderItems: [
      // items that needs to be lazily resolved by managers
      {
        rawInput: {
          delete: {
            item: UserUniqueEmail,
            primaryKey: {
              id: '3',
            },
          },
        },
        transformedInput: {
          entityClass: UserUniqueEmail,
          lazyLoadTransactionWriteItems: expect.any(Function),
          primaryKeyAttributes: {
            id: '3',
          },
        },
      },
    ],
    transactionListItems: [
      // list of transactItems input, that must be processed over the transaction api
      {
        rawInput: {
          create: {
            item: user2,
          },
        },
        transformedInput: [
          {
            Put: {
              ConditionExpression:
                '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
              ExpressionAttributeNames: {
                '#CE_PK': 'PK',
                '#CE_SK': 'SK',
              },
              Item: {
                GSI1PK: 'USER#STATUS#active',
                GSI1SK: 'USER#user 2',
                PK: 'USER#2',
                SK: 'USER#2',
                __en: 'user',
                email: 'user@test.com',
                id: '2',
                name: 'user 2',
                status: 'active',
              },
              TableName: 'test-table',
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
                PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@test.com',
                SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@test.com',
              },
              TableName: 'test-table',
            },
          },
        ],
      },
    ],
  });
});

test('transforms requests into multiple batch requests when there are more than allowed items to write', () => {
  let largeBatchOfUsers = Array(60).fill({});

  largeBatchOfUsers = largeBatchOfUsers.map((empty, index) => {
    const user = new User();
    user.id = (++index).toString();
    user.status = 'active';
    user.name = `User ${index}`;

    return {
      create: {
        item: user,
      },
    };
  });
  const writeBatch = new WriteBatch().add(largeBatchOfUsers);

  const transformed = dcBatchTransformer.toDynamoWriteBatchItems(writeBatch);
  expect(transformed.batchWriteRequestMapItems.length).toEqual(3);
  expect(transformed.batchWriteRequestMapItems[0][table.name].length).toEqual(
    25
  );
  expect(transformed.batchWriteRequestMapItems[1][table.name].length).toEqual(
    25
  );
  expect(transformed.batchWriteRequestMapItems[2][table.name].length).toEqual(
    10
  );
});

test('transforms requests of items with multiple tables', () => {
  resetTestConnection();

  const oldUserTable = new Table({
    name: 'old-user-table',
    partitionKey: 'PK',
  });

  @Entity({
    name: 'old-user',
    primaryKey: {
      partitionKey: 'OLD_USER#{{id}}',
    },
    table: oldUserTable,
  })
  class OldUser {
    @Attribute()
    id: string;
  }

  connection = createTestConnection({
    entities: [User, OldUser],
    table,
  });
  dcBatchTransformer = new DocumentClientBatchTransformer(connection);

  let largeBatchOfMixedUsers = Array(32).fill({});

  largeBatchOfMixedUsers = largeBatchOfMixedUsers.map((empty, index) => {
    const user = new User();
    user.id = index.toString();
    user.status = 'active';
    user.name = `User ${index}`;

    const oldUser = new OldUser();
    oldUser.id = index.toString();

    return {
      create: {
        // randomize request with mixed old and new users
        item: index % 2 === 0 ? user : oldUser,
      },
    };
  });

  const writeBatch = new WriteBatch().add(largeBatchOfMixedUsers);

  const {
    batchWriteRequestMapItems,
  } = dcBatchTransformer.toDynamoWriteBatchItems(writeBatch);
  expect(batchWriteRequestMapItems.length).toEqual(2);
  expect(batchWriteRequestMapItems[0][table.name].length).toEqual(16);
  expect(batchWriteRequestMapItems[0][oldUserTable.name].length).toEqual(9);
  expect(batchWriteRequestMapItems[1][oldUserTable.name].length).toEqual(7);
});
