import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {User, UserPrimaryKey} from '../../../../__mocks__/user';
import {UserUniqueEmail} from '../../../../__mocks__/user-unique-email';
import {WriteTransaction} from '../write-transaction';
import {Connection} from '../../connection/connection';

let writeTransaction: WriteTransaction;
let connection: Connection;
beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail],
  });
  writeTransaction = new WriteTransaction(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('creates transaction item with existing items', () => {
  const transaction = new WriteTransaction(connection, [
    {
      Put: {
        Item: {
          name: '1',
        },
        TableName: 'table',
      },
    },
  ]);

  expect(transaction.items).toEqual([
    {Put: {Item: {name: '1'}, TableName: 'table'}},
  ]);
});

test('creates transaction update item with given condition', () => {
  const transaction = new WriteTransaction(connection);
  transaction.chian({
    update: {
      item: User,
      primaryKey: {
        id: '111',
      },
      body: {
        name: 'updated name',
      },
      options: {
        where: {
          age: {
            LE: 1,
          },
        },
      },
    },
  });

  expect(transaction.items).toEqual([
    {
      Update: {
        ConditionExpression: '#CE_age <= :CE_age',
        ExpressionAttributeNames: {
          '#CE_age': 'age',
          '#attr0': 'name',
          '#attr1': 'GSI1SK',
        },
        ExpressionAttributeValues: {
          ':CE_age': 1,
          ':val0': 'updated name',
          ':val1': 'USER#updated name',
        },
        Key: {
          PK: 'USER#111',
          SK: 'USER#111',
        },
        TableName: 'test-table',
        UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
      },
    },
  ]);
});

test('creates transaction  with delete item and given condition', () => {
  const transaction = new WriteTransaction(connection);
  transaction.chian({
    delete: {
      item: User,
      primaryKey: {
        id: '111',
      },
      options: {
        where: {
          age: {
            LE: 1,
          },
        },
      },
    },
  });

  expect(transaction.items).toEqual([
    {
      Delete: {
        ConditionExpression: '#CE_age <= :CE_age',
        ExpressionAttributeNames: {
          '#CE_age': 'age',
        },
        ExpressionAttributeValues: {
          ':CE_age': 1,
        },
        Key: {
          PK: 'USER#111',
          SK: 'USER#111',
        },
        TableName: 'test-table',
      },
    },
  ]);
});

test('creates transaction put item with given condition', () => {
  const transaction = new WriteTransaction(connection);
  const user = new User();
  user.id = '1';
  user.name = 'test user';
  user.status = 'active';

  transaction.chian({
    create: {
      item: user,
      options: {
        where: {
          age: {
            LE: 1,
          },
        },
      },
    },
  });

  expect(transaction.items).toEqual([
    {
      Put: {
        ConditionExpression:
          '((attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))) AND (#CE_age <= :CE_age)',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
          '#CE_SK': 'SK',
          '#CE_age': 'age',
        },
        ExpressionAttributeValues: {
          ':CE_age': 1,
        },
        Item: {
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#test user',
          PK: 'USER#1',
          SK: 'USER#1',
          __en: 'user',
          id: '1',
          name: 'test user',
          status: 'active',
        },
        TableName: 'test-table',
      },
    },
  ]);
});

/**
 * @group chain
 */
test('chains simple transaction requests', () => {
  const user = new User();
  user.name = 'user-name';
  user.id = '123';
  user.status = 'active';

  const transaction = writeTransaction
    .chian({
      create: {
        item: user,
      },
    })
    .chian<UserPrimaryKey, User>({
      update: {
        item: User,
        primaryKey: {
          id: '123',
        },
        body: {
          name: 'new name',
        },
      },
    });

  expect(transaction.items).toEqual([
    {
      Put: {
        Item: {
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#user-name',
          PK: 'USER#123',
          SK: 'USER#123',
          __en: 'user',
          id: '123',
          name: 'user-name',
          status: 'active',
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
        ExpressionAttributeNames: {'#attr0': 'name', '#attr1': 'GSI1SK'},
        ExpressionAttributeValues: {
          ':val0': 'new name',
          ':val1': 'USER#new name',
        },
        Key: {PK: 'USER#123', SK: 'USER#123'},
        TableName: 'test-table',
        UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
      },
    },
  ]);
});

test('chains complex transaction requests', () => {
  const user = new UserUniqueEmail();
  user.id = '1';
  user.email = 'user@example.com';
  user.status = 'inactive';
  user.name = 'new user';

  const transaction = writeTransaction
    .chian({
      create: {
        item: user,
      },
    })
    .chian<UserPrimaryKey, UserUniqueEmail>({
      update: {
        item: UserUniqueEmail,
        primaryKey: {
          id: '123',
        },
        body: {
          email: 'example@email.com',
        },
      },
    });

  expect(transaction.items).toMatchObject([
    {
      Put: {
        ConditionExpression:
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
          '#CE_SK': 'SK',
        },
        Item: {
          PK: 'USER#1',
          SK: 'USER#1',
          GSI1PK: 'USER#STATUS#inactive',
          GSI1SK: 'USER#new user',
          email: 'user@example.com',
          id: '1',
          __en: 'user',
          name: 'new user',
          status: 'inactive',
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
          PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
          SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
        },
        TableName: 'test-table',
      },
    },
    {
      entityClass: UserUniqueEmail,
      primaryKeyAttributes: {
        id: '123',
      },
    },
  ]);
});
