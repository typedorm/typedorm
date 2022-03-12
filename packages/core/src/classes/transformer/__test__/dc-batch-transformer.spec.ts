import {Attribute, Entity, Table} from '@typedorm/common';
import {Organisation} from '@typedorm/core/__mocks__/organisation';
import {table} from '@typedorm/core/__mocks__/table';
import {User} from '@typedorm/core/__mocks__/user';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {ReadBatch} from '../../batch/read-batch';
import {WriteBatch} from '../../batch/write-batch';
import {Connection} from '../../connection/connection';
import {DocumentClientBatchTransformer} from '../document-client-batch-transformer';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('66a7b3d6-323a-49b0-a12d-c99afff5005a'),
  validate: jest.fn().mockReturnValue(true),
  v5: jest.requireActual('uuid').v5,
}));

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

  expect(transformed).toMatchObject({
    // items that can be processed as batch items
    // each item in the list represents new bath requests
    batchWriteRequestMapItems: [
      {
        'test-table': [
          {
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
          {
            DeleteRequest: {
              Key: {
                PK: 'ORG#ORG_ID_1',
                SK: 'ORG#ORG_ID_1',
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
                __en: 'user-unique-email',
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

  expect(transformed.metadata).toMatchObject({
    itemTransformHashMap: expect.any(Map),
    namespaceId: '66a7b3d6-323a-49b0-a12d-c99afff5005a',
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

/**
 * @group toWriteBatchInputList
 */
test('reverse transforms batch item input in initial input', () => {
  // create mock item transform hash
  const user = new User();
  user.id = '1111-1111';
  user.status = 'active';
  user.name = 'User 1';
  const writeBatch = new WriteBatch().add([
    {
      create: {
        item: user,
      },
    },
    {
      delete: {
        item: User,
        primaryKey: {
          id: '1111-1111',
        },
      },
    },
  ]);
  const {metadata} = dcBatchTransformer.toDynamoWriteBatchItems(writeBatch);

  const original = dcBatchTransformer.toWriteBatchInputList(
    {
      'test-table': [
        {
          DeleteRequest: {
            Key: {
              PK: 'USER#1111-1111',
              SK: 'USER#1111-1111',
            },
          },
        },
        {
          PutRequest: {
            Item: {
              __en: 'user',
              GSI1PK: 'USER#STATUS#active',
              GSI1SK: 'USER#User 1',
              id: '1111-1111',
              name: 'User 1',
              PK: 'USER#1111-1111',
              SK: 'USER#1111-1111',
              status: 'active',
            },
          },
        },
      ],
    },
    {
      itemTransformHashMap: metadata.itemTransformHashMap,
      namespaceId: metadata.namespaceId,
    }
  );

  expect(original).toEqual([
    {
      delete: {
        item: User,
        primaryKey: {
          id: '1111-1111',
        },
      },
    },
    {
      create: {
        item: {
          id: '1111-1111',
          name: 'User 1',
          status: 'active',
        },
      },
    },
  ]);
});

/**
 * @group toDynamoReadBatchItems
 */

test('transforms simple batch read items', () => {
  const transformed = dcBatchTransformer.toDynamoReadBatchItems(
    new ReadBatch().add([
      {
        item: User,
        primaryKey: {
          id: '1',
        },
      },
      {
        item: User,
        primaryKey: {
          id: '2',
        },
      },
    ])
  );

  expect(transformed.batchRequestItemsList).toEqual([
    {
      'test-table': {
        Keys: [
          {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          {
            PK: 'USER#2',
            SK: 'USER#2',
          },
        ],
      },
    },
  ]);

  expect(transformed.metadata).toEqual({
    itemTransformHashMap: expect.any(Map),
    namespaceId: '66a7b3d6-323a-49b0-a12d-c99afff5005a',
  });
});

test('transforms requests into multiple batch requests when there are more than allowed items to read', () => {
  let largeBatchOfItems = Array(120).fill({});

  largeBatchOfItems = largeBatchOfItems.map((empty, index) => {
    return {
      item: User,
      primaryKey: {
        id: index.toString(),
      },
    };
  });
  const readBatch = new ReadBatch().add(largeBatchOfItems);

  const transformed = dcBatchTransformer.toDynamoReadBatchItems(readBatch);
  expect(transformed.batchRequestItemsList.length).toEqual(2);
  expect(transformed.batchRequestItemsList[0][table.name].Keys?.length).toEqual(
    100
  );
  expect(transformed.batchRequestItemsList[1][table.name].Keys?.length).toEqual(
    20
  );
});

test('transforms batch requests of items with multiple tables', () => {
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

  let largeBatchOfMixedUsers = Array(132).fill({});

  largeBatchOfMixedUsers = largeBatchOfMixedUsers.map((empty, index) => {
    const user = {
      item: User,
      primaryKey: {
        id: index.toString(),
      },
    };
    const oldUser = {
      item: OldUser,
      primaryKey: {
        id: index.toString(),
      },
    };

    return index % 2 === 0 ? user : oldUser;
  });

  const readBatch = new ReadBatch().add(largeBatchOfMixedUsers);

  const transformed = dcBatchTransformer.toDynamoReadBatchItems(readBatch);
  expect(transformed.batchRequestItemsList).toMatchSnapshot();
  expect(transformed.batchRequestItemsList.length).toEqual(2);
  expect(transformed.batchRequestItemsList[0][table.name].Keys?.length).toEqual(
    66
  );
  expect(
    transformed.batchRequestItemsList[0][oldUserTable.name].Keys?.length
  ).toEqual(34);
  expect(
    transformed.batchRequestItemsList[1][oldUserTable.name].Keys?.length
  ).toEqual(32);
});

/**
 * @group toReadBatchInputList
 */
test('reverse transforms read batch item request', () => {
  const originalInput = [
    {
      item: User,
      primaryKey: {
        id: '1',
      },
    },
    {
      item: User,
      primaryKey: {
        id: '2',
      },
    },
  ];
  const readBatch = new ReadBatch().add(originalInput);
  const {metadata} = dcBatchTransformer.toDynamoReadBatchItems(readBatch);

  const transformedOriginal = dcBatchTransformer.toReadBatchInputList(
    {
      'test-table': {
        Keys: [
          {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          {
            PK: 'USER#2',
            SK: 'USER#2',
          },
        ],
      },
    },
    {
      itemTransformHashMap: metadata.itemTransformHashMap,
      namespaceId: metadata.namespaceId,
    }
  );

  expect(transformedOriginal).toEqual(originalInput);
});
