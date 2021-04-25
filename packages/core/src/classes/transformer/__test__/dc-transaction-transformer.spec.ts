import {WriteTransaction} from './../../transaction/write-transaction';
import {Organisation} from '@typedorm/core/__mocks__/organisation';
import {table} from '@typedorm/core/__mocks__/table';
import {User} from '@typedorm/core/__mocks__/user';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {DocumentClientTransactionTransformer} from '../document-client-transaction-transformer';

let connection: Connection;
let dcTransactionTransformer: DocumentClientTransactionTransformer;
beforeEach(() => {
  connection = createTestConnection({
    entities: [User, Organisation, UserUniqueEmail],
    table,
  });
  dcTransactionTransformer = new DocumentClientTransactionTransformer(
    connection
  );
});

afterEach(() => {
  resetTestConnection();
});

test('correctly extends low order transformers', () => {
  expect(dcTransactionTransformer.connection).toEqual(connection);
});

/**
 * @group toDynamoWriteTransactionItems
 */
test('transforms simple transaction write items', () => {
  const user1 = new User();
  user1.id = '1';
  user1.status = 'inactive';
  user1.name = 'user 1';
  const writeTransaction = new WriteTransaction()
    .addCreateItem(user1)
    .addUpdateItem(
      User,
      {
        id: '1',
      },
      {
        name: 'new name',
      }
    );

  const transformed = dcTransactionTransformer.toDynamoWriteTransactionItems(
    writeTransaction
  );
  expect(transformed).toEqual({
    lazyTransactionWriteItemListLoader: [],
    transactionItemList: [
      {
        Put: {
          ConditionExpression:
            '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
            '#CE_SK': 'SK',
          },
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
          TableName: 'test-table',
        },
      },
      {
        Update: {
          ExpressionAttributeNames: {
            '#attr0': 'name',
            '#attr1': 'GSI1SK',
          },
          ExpressionAttributeValues: {
            ':val0': 'new name',
            ':val1': 'USER#new name',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
          UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
        },
      },
    ],
  });
});

test('transforms transaction write items with unique attributes', () => {
  const user1 = new User();
  user1.id = '1';
  user1.status = 'inactive';
  user1.name = 'user 1';
  const writeTransaction = new WriteTransaction()
    .addCreateItem(user1)
    .addUpdateItem(
      UserUniqueEmail,
      {
        id: '1',
      },
      {
        email: 'newEmail@user.com',
      }
    );

  const transformed = dcTransactionTransformer.toDynamoWriteTransactionItems(
    writeTransaction
  );
  expect(transformed).toEqual({
    lazyTransactionWriteItemListLoader: [
      {
        entityClass: UserUniqueEmail,
        lazyLoadTransactionWriteItems: expect.any(Function),
        primaryKeyAttributes: {
          id: '1',
        },
      },
    ],
    transactionItemList: [
      {
        Put: {
          ConditionExpression:
            '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
          ExpressionAttributeNames: {
            '#CE_PK': 'PK',
            '#CE_SK': 'SK',
          },
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
          TableName: 'test-table',
        },
      },
    ],
  });
});

test('creates transaction put item with given condition', () => {
  const transaction = new WriteTransaction(connection);
  const user = new User();
  user.id = '1';
  user.name = 'test user';
  user.status = 'active';

  transaction.add([
    {
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
    },
  ]);

  const transformed = dcTransactionTransformer.toDynamoWriteTransactionItems(
    transaction
  );

  expect(transformed).toEqual({
    lazyTransactionWriteItemListLoader: [],
    transactionItemList: [
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
    ],
  });
});
