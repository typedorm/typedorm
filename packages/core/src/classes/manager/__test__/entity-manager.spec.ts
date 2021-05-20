jest.useFakeTimers('modern').setSystemTime(new Date(1606896235000));

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '../entity-manager';
import {User, UserPrimaryKey} from '../../../../__mocks__/user';
import {
  UserUniqueEmail,
  UserUniqueEmailPrimaryKey,
} from '../../../../__mocks__/user-unique-email';
import {
  UserAutoGenerateAttributesPrimaryKey,
  UserAutoGenerateAttributes,
} from '../../../../__mocks__/user-auto-generate-attributes';
import {Connection} from '../../connection/connection';
import {CONSUMED_CAPACITY_TYPE} from '@typedorm/common';

let manager: EntityManager;
let connection: Connection;
const dcMock = {
  put: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  transactWrite: jest.fn(),
};
beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail, UserAutoGenerateAttributes],
    documentClient: dcMock,
  });

  manager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group create
 */
test('creates entity', async () => {
  dcMock.put.mockReturnValue({
    promise: () => ({}),
  });

  const user = new User();
  user.id = '1';
  user.name = 'Test User';
  user.status = 'active';

  const userEntity = await manager.create(user, undefined, {
    returnConsumedCapacity: CONSUMED_CAPACITY_TYPE.TOTAL,
  });
  expect(dcMock.put).toHaveBeenCalledTimes(1);
  expect(dcMock.put).toHaveBeenCalledWith({
    Item: {
      GSI1PK: 'USER#STATUS#active',
      GSI1SK: 'USER#Test User',
      PK: 'USER#1',
      SK: 'USER#1',
      id: '1',
      __en: 'user',
      name: 'Test User',
      status: 'active',
    },
    TableName: 'test-table',
    ReturnConsumedCapacity: 'TOTAL',
    ConditionExpression:
      '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
  });
  expect(userEntity).toEqual({
    id: '1',
    name: 'Test User',
    status: 'active',
  });
});

test('creates entity with possible overwrite', async () => {
  dcMock.put.mockReturnValue({
    promise: () => ({}),
  });

  const user = new User();
  user.id = '1';
  user.name = 'Test User';
  user.status = 'active';

  const userEntity = await manager.create(user, {
    overwriteIfExists: true,
  });
  expect(dcMock.put).toHaveBeenCalledTimes(1);
  expect(dcMock.put).toHaveBeenCalledWith({
    Item: {
      GSI1PK: 'USER#STATUS#active',
      GSI1SK: 'USER#Test User',
      PK: 'USER#1',
      SK: 'USER#1',
      id: '1',
      __en: 'user',
      name: 'Test User',
      status: 'active',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toEqual({
    id: '1',
    name: 'Test User',
    status: 'active',
  });
});

test('creates entity with possible overwrite and given condition', async () => {
  dcMock.put.mockReturnValue({
    promise: () => ({}),
  });

  const user = new User();
  user.id = '1';
  user.name = 'Test User';
  user.status = 'active';

  const userEntity = await manager.create<User>(user, {
    overwriteIfExists: true,
    where: {
      NOT: {
        id: {
          EQ: '1',
        },
      },
    },
  });
  expect(dcMock.put).toHaveBeenCalledTimes(1);
  expect(dcMock.put).toHaveBeenCalledWith({
    Item: {
      GSI1PK: 'USER#STATUS#active',
      GSI1SK: 'USER#Test User',
      PK: 'USER#1',
      SK: 'USER#1',
      id: '1',
      __en: 'user',
      name: 'Test User',
      status: 'active',
    },
    ConditionExpression: 'NOT (#CE_id = :CE_id)',
    ExpressionAttributeNames: {
      '#CE_id': 'id',
    },
    ExpressionAttributeValues: {
      ':CE_id': '1',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toEqual({
    id: '1',
    name: 'Test User',
    status: 'active',
  });
});

/**
 * Issue: #11
 */
test('creates entity and returns all attributes, including auto generated ones', async () => {
  dcMock.put.mockReturnValue({
    promise: () => ({}),
  });

  const user = new UserAutoGenerateAttributes();
  user.id = '1';

  const userEntity = await manager.create(user);
  expect(dcMock.put).toHaveBeenCalledTimes(1);
  expect(dcMock.put).toHaveBeenCalledWith({
    Item: {
      GSI1PK: 'USER#UPDATED_AT#1606896235',
      GSI1SK: 'USER#1',
      PK: 'USER#1',
      SK: 'USER#1',
      id: '1',
      __en: 'user',
      updatedAt: 1606896235,
    },
    TableName: 'test-table',
    ConditionExpression:
      '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
  });
  expect(userEntity).toEqual({
    id: '1',
    updatedAt: 1606896235,
  });
});

/**
 * @group findOne
 */
test('finds one entity by given primary key', async () => {
  dcMock.get.mockReturnValue({
    promise: () => ({
      Item: {
        PK: 'USER#1',
        SK: 'USER#1',
        GSI1PK: 'USER#STATUS#active',
        GSI1SK: 'USER#Me',
        id: '1',
        name: 'Me',
        status: 'active',
      },
    }),
  });

  const userEntity = await manager.findOne<User, UserPrimaryKey>(User, {
    id: '1',
  });
  expect(dcMock.get).toHaveBeenCalledTimes(1);
  expect(dcMock.get).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toEqual({
    id: '1',
    name: 'Me',
    status: 'active',
  });
});

// issue: 110
test('returns undefined when no item was found with given primary key', async () => {
  dcMock.get.mockReturnValue({
    promise: () => ({}),
  });

  const userEntity = await manager.findOne<User, UserPrimaryKey>(User, {
    id: '1',
  });

  expect(dcMock.get).toHaveBeenCalledTimes(1);
  expect(dcMock.get).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toBeUndefined();
});

test('throws an error when trying to do a get request with non primary key attributes', async () => {
  await expect(
    manager.findOne(User, {
      name: 'User',
    })
  ).rejects.toThrowError(
    '"id" was referenced in USER#{{id}} but it\'s value could not be resolved.'
  );
});

/**
 * @group exists
 */
test('checks if given item exists', async () => {
  dcMock.get.mockReturnValue({
    promise: () => ({
      Item: {
        PK: 'USER#1',
        SK: 'USER#1',
        GSI1PK: 'USER#STATUS#active',
        GSI1SK: 'USER#Me',
        id: '1',
        name: 'Me',
        status: 'active',
      },
    }),
  });

  const userEntity = await manager.exists<User, UserUniqueEmailPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      returnConsumedCapacity: CONSUMED_CAPACITY_TYPE.INDEXES,
    }
  );

  expect(dcMock.get).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
    ReturnConsumedCapacity: 'INDEXES',
  });
  expect(userEntity).toEqual(true);
});

// issue: 110
test('returns correct value when trying check existence of item that does not exist', async () => {
  dcMock.get.mockReturnValue({
    promise: () => ({}),
  });

  const userEntity = await manager.exists<User, UserUniqueEmailPrimaryKey>(
    User,
    {
      id: '1',
    }
  );

  expect(dcMock.get).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toEqual(false);
});

test('checks if item with given unique attribute exists', async () => {
  dcMock.get.mockReturnValue({
    promise: () => ({
      Item: {
        PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
        SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
      },
    }),
  });

  const userEntity = await manager.exists<UserUniqueEmail>(UserUniqueEmail, {
    email: 'user@example.com',
  });

  expect(dcMock.get).toHaveBeenCalledWith({
    Key: {
      PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
      SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toEqual(true);
});

test('throws an error if trying to perform exists check with non key or non unique attributes', async () => {
  expect(dcMock.get).not.toHaveBeenCalled();
  await expect(
    async () =>
      await manager.exists<UserUniqueEmail>(UserUniqueEmail, {
        status: 'active',
      })
  ).rejects.toThrowError(
    'Only attributes that are part of primary key or is marked as unique attribute can be queried, attribute "status is neither."'
  );
});

test('throws an error if trying to perform exists check with partial primary key', async () => {
  await expect(
    manager.findOne(User, {
      name: 'User',
    })
  ).rejects.toThrowError(
    '"id" was referenced in USER#{{id}} but it\'s value could not be resolved.'
  );
});

/**
 * @group update
 */
test('updates item and return all new attributes', async () => {
  dcMock.update.mockReturnValue({
    promise: () => ({
      Attributes: {
        PK: 'USER#1',
        SK: 'USER#1',
        GSI1PK: 'USER#STATUS#active',
        GSI1SK: 'USER#Me',
        id: '1',
        name: 'user',
        status: 'active',
      },
    }),
  });
  const updatedItem = await manager.update<User, UserPrimaryKey>(
    User,
    {id: '1'},
    {
      name: 'user',
      status: 'active',
    }
  );

  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#attr0': 'name',
      '#attr1': 'status',
      '#attr2': 'GSI1SK',
      '#attr3': 'GSI1PK',
    },
    ExpressionAttributeValues: {
      ':val0': 'user',
      ':val1': 'active',
      ':val2': 'USER#user',
      ':val3': 'USER#STATUS#active',
    },
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression:
      'SET #attr0 = :val0, #attr1 = :val1, #attr2 = :val2, #attr3 = :val3',
  });
  expect(updatedItem).toEqual({id: '1', name: 'user', status: 'active'});
});

test('updates item and attributes marked to be autoUpdated', async () => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'));

  dcMock.update.mockReturnValue({
    promise: () => ({
      Attributes: {
        PK: 'USER#1',
        SK: 'USER#1',
        GSI1PK: 'USER#STATUS#active',
        GSI1SK: 'USER#Me',
        id: '1',
        name: 'Me',
        status: 'active',
      },
    }),
  });

  const updatedItem = await manager.update<
    UserAutoGenerateAttributes,
    UserAutoGenerateAttributesPrimaryKey
  >(
    UserAutoGenerateAttributes,
    {id: '1'},
    {},
    {
      nestedKeySeparator: '.',
    }
  );

  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#attr0': 'updatedAt',
      '#attr1': 'GSI1PK',
    },
    ExpressionAttributeValues: {
      ':val0': 1577836800,
      ':val1': 'USER#UPDATED_AT#1577836800',
    },
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
  });
  expect(updatedItem).toEqual({id: '1', name: 'Me', status: 'active'});
});

test('updates item with unique attributes and returns all updated attributes', async () => {
  manager.findOne = jest
    .fn()
    // mock first call to return existing item, this will be called before update is performed
    .mockImplementationOnce(() => ({
      id: '1',
      email: 'old@email.com',
      status: 'active',
    }))
    // mock send call to return new updated item, this will be called after update is performed
    .mockImplementationOnce(() => ({
      id: '1',
      email: 'new@email.com',
      status: 'active',
    }));

  const updateOperationSpy = dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [
          {
            TableName: 'my-table',
            CapacityUnits: 123.3,
          },
        ],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const updatedItem = await manager.update<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >(
    UserUniqueEmail,
    {
      id: '1',
    },
    {
      email: 'new@examil.com',
    },
    {},
    {
      requestId: 'MY_CUSTOM_UNIQUE_REQUEST_ID',
    }
  );

  expect(updateOperationSpy).toHaveBeenCalledTimes(1);
  expect(updateOperationSpy).toHaveBeenCalledWith({
    TransactItems: [
      {
        Update: {
          ExpressionAttributeNames: {
            '#attr0': 'email',
          },
          ExpressionAttributeValues: {
            ':val0': 'new@examil.com',
          },
          Key: {
            PK: 'USER#1',
            SK: 'USER#1',
          },
          TableName: 'test-table',
          UpdateExpression: 'SET #attr0 = :val0',
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
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@examil.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@examil.com',
          },
          TableName: 'test-table',
        },
      },
      {
        Delete: {
          Key: {
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
          },
          TableName: 'test-table',
        },
      },
    ],
  });
  expect(updatedItem).toEqual({
    id: '1',
    email: 'new@email.com',
    status: 'active',
  });
});

test('updates item and return all new attributes with given condition', async () => {
  dcMock.update.mockReturnValue({
    promise: () => ({
      Attributes: {
        PK: 'USER#1',
        SK: 'USER#1',
        GSI1PK: 'USER#STATUS#active',
        GSI1SK: 'USER#Me',
        id: '1',
        name: 'user',
        status: 'active',
        age: 4,
      },
    }),
  });
  const updatedItem = await manager.update<User, UserPrimaryKey>(
    User,
    {id: '1'},
    {
      name: 'user',
      status: 'active',
    },
    {
      where: {
        age: {
          BETWEEN: [1, 11],
        },
      },
    }
  );

  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#attr0': 'name',
      '#attr1': 'status',
      '#attr2': 'GSI1SK',
      '#attr3': 'GSI1PK',
      '#CE_age': 'age',
    },
    ExpressionAttributeValues: {
      ':val0': 'user',
      ':val1': 'active',
      ':val2': 'USER#user',
      ':val3': 'USER#STATUS#active',
      ':CE_age_end': 11,
      ':CE_age_start': 1,
    },
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression:
      'SET #attr0 = :val0, #attr1 = :val1, #attr2 = :val2, #attr3 = :val3',
    ConditionExpression: '#CE_age BETWEEN :CE_age_start AND :CE_age_end',
  });
  expect(updatedItem).toEqual({
    id: '1',
    name: 'user',
    status: 'active',
    age: 4,
  });
});

test('does not update an item when failed to get item by key', async () => {
  manager.findOne = jest.fn();

  const updatedItem = async () =>
    await manager.update<UserUniqueEmail, UserUniqueEmailPrimaryKey>(
      UserUniqueEmail,
      {
        id: '1',
      },
      {
        email: 'new@examil.com',
      }
    );

  await expect(updatedItem).rejects.toThrow(
    'Failed to update entity, could not find entity with primary key "{"id":"1"}"'
  );
});

/**
 * @group delete
 */
test('deletes item by primary key', async () => {
  dcMock.delete.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Attributes: {},
    }),
  });

  const result = await manager.delete<User, UserPrimaryKey>(User, {
    id: '1',
  });

  expect(dcMock.delete).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
  expect(result).toEqual({
    success: true,
  });
});

test('deletes item by primary key and given condition', async () => {
  dcMock.delete.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Attributes: {},
    }),
  });

  const result = await manager.delete<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      where: {
        status: {
          NE: 'active',
        },
      },
    }
  );

  expect(dcMock.delete).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
    ConditionExpression: '#CE_status <> :CE_status',
    ExpressionAttributeNames: {
      '#CE_status': 'status',
    },
    ExpressionAttributeValues: {
      ':CE_status': 'active',
    },
  });
  expect(result).toEqual({
    success: true,
  });
});

test('throws an error when trying to delete item by non primary key attributes', async () => {
  await expect(
    manager.delete(User, {
      name: 'User',
    })
  ).rejects.toThrowError(
    '"id" was referenced in USER#{{id}} but it\'s value could not be resolved.'
  );
});

test('deletes an item with unique attributes', async () => {
  manager.findOne = jest.fn().mockReturnValue({
    id: '1',
    email: 'old@email.com',
    status: 'active',
  });

  const deleteItemOperation = dcMock.transactWrite.mockReturnValue({
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  });

  const deletedResponse = await manager.delete<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >(UserUniqueEmail, {
    id: '1',
  });

  expect(deleteItemOperation).toHaveBeenCalledTimes(1);
  expect(deleteItemOperation).toHaveBeenCalledWith({
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
            PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
            SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
          },
          TableName: 'test-table',
        },
      },
    ],
  });
  expect(deletedResponse).toEqual({
    success: true,
  });
});

/**
 * @group find
 */
test('finds items matching given query params', async () => {
  dcMock.query.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Items: [
        {
          PK: 'USER#1',
          SK: 'USER#1',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#Me',
          id: '1',
          name: 'Me',
          status: 'active',
        },
        {
          PK: 'USER#2',
          SK: 'USER#2',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#Me2',
          id: '2',
          name: 'Me',
          status: 'active',
        },
      ],
    }),
  });

  const users = await manager.find<User, UserPrimaryKey>(
    User,
    {
      id: 'aaaa',
    },
    {
      keyCondition: {
        BEGINS_WITH: 'USER#',
      },
      limit: 10,
    }
  );

  expect(dcMock.query).toHaveBeenCalledTimes(1);
  expect(dcMock.query).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#KY_CE_SK': 'SK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#aaaa',
      ':KY_CE_SK': 'USER#',
    },
    KeyConditionExpression:
      '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
    Limit: 10,
    ScanIndexForward: true,
    TableName: 'test-table',
  });
  expect(users).toEqual({
    items: [
      {
        id: '1',
        name: 'Me',
        status: 'active',
      },
      {
        id: '2',
        name: 'Me',
        status: 'active',
      },
    ],
  });
});

test('finds items matching given query params and options', async () => {
  dcMock.query.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Items: [
        {
          PK: 'USER#1',
          SK: 'USER#1',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#Me',
          id: '1',
          name: 'Me',
          status: 'active',
          age: 4,
        },
      ],
    }),
  });

  const users = await manager.find<User, UserPrimaryKey>(
    User,
    {
      id: 'aaaa',
    },
    {
      keyCondition: {
        BEGINS_WITH: 'USER#',
      },
      where: {
        AND: {
          age: {
            BETWEEN: [1, 5],
          },
          name: {
            EQ: 'Me',
          },
          status: 'ATTRIBUTE_EXISTS',
        },
      },
      limit: 10,
    }
  );

  expect(dcMock.query).toHaveBeenCalledTimes(1);
  expect(dcMock.query).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#KY_CE_SK': 'SK',
      '#FE_age': 'age',
      '#FE_name': 'name',
      '#FE_status': 'status',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#aaaa',
      ':KY_CE_SK': 'USER#',
      ':FE_age_end': 5,
      ':FE_age_start': 1,
      ':FE_name': 'Me',
    },
    KeyConditionExpression:
      '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
    FilterExpression:
      '(#FE_age BETWEEN :FE_age_start AND :FE_age_end) AND (#FE_name = :FE_name) AND (attribute_exists(#FE_status))',
    Limit: 10,
    ScanIndexForward: true,
    TableName: 'test-table',
  });
  expect(users).toEqual({
    items: [
      {
        id: '1',
        name: 'Me',
        status: 'active',
        age: 4,
      },
    ],
  });
});

test('finds items with alternate syntax', async () => {
  dcMock.query.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Items: [
        {
          PK: 'USER#1',
          SK: 'USER#1',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#Me',
          id: '1',
          name: 'Me',
          status: 'active',
        },
      ],
    }),
  });

  const users = await manager.find<User>(User, 'USER#1', {
    keyCondition: {
      BEGINS_WITH: 'USER#',
    },
    limit: 10,
  });

  expect(dcMock.query).toHaveBeenCalledTimes(1);
  expect(dcMock.query).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#KY_CE_SK': 'SK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#1',
      ':KY_CE_SK': 'USER#',
    },
    KeyConditionExpression:
      '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
    Limit: 10,
    ScanIndexForward: true,
    TableName: 'test-table',
  });
  expect(users).toEqual({
    items: [
      {
        id: '1',
        name: 'Me',
        status: 'active',
      },
    ],
  });
});

test('finds item from given cursor position', async () => {
  dcMock.query.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Items: [
        {
          PK: 'USER#1',
          SK: 'USER#1',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#Me',
          id: '1',
          name: 'Me',
          status: 'active',
        },
        {
          PK: 'USER#2',
          SK: 'USER#2',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#Me2',
          id: '2',
          name: 'Me',
          status: 'active',
        },
      ],
    }),
  });

  await manager.find<User, UserPrimaryKey>(
    User,
    {
      id: 'aaaa',
    },
    {
      keyCondition: {
        BEGINS_WITH: 'USER#',
      },
      limit: 10,
      cursor: {
        partitionKey: 'USER#1',
        sortKey: 'USER#1',
      },
    }
  );

  expect(dcMock.query).toHaveBeenCalledWith({
    ExclusiveStartKey: {
      partitionKey: 'USER#1',
      sortKey: 'USER#1',
    },
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#KY_CE_SK': 'SK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#aaaa',
      ':KY_CE_SK': 'USER#',
    },
    KeyConditionExpression:
      '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
    Limit: 10,
    ScanIndexForward: true,
    TableName: 'test-table',
  });
});

test('queries items until limit is met', async () => {
  const itemsToReturn: any[] = [];
  for (let index = 1; index <= 1000; index++) {
    itemsToReturn.push({
      id: index.toString(),
      status: 'active',
      PK: `USER#${index}`,
      SK: `USER#${index}`,
    });
  }
  dcMock.query
    .mockImplementationOnce(() => ({
      promise: jest.fn().mockReturnValue({
        Items: itemsToReturn,
        Count: itemsToReturn.length,
        LastEvaluatedKey: {
          partitionKey: 'USER#1000',
          sortKey: 'USER#1000',
        },
      }),
    }))
    .mockImplementationOnce(() => ({
      promise: jest.fn().mockReturnValue({
        Items: itemsToReturn,
        Count: itemsToReturn.length,
      }),
    }));

  const users = await manager.find<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      keyCondition: {
        BEGINS_WITH: 'USER#',
      },
      limit: 2000,
    }
  );

  expect(dcMock.query).toHaveBeenCalledTimes(2);
  expect(dcMock.query.mock.calls).toEqual([
    [
      {
        ExpressionAttributeNames: {
          '#KY_CE_PK': 'PK',
          '#KY_CE_SK': 'SK',
        },
        ExpressionAttributeValues: {
          ':KY_CE_PK': 'USER#1',
          ':KY_CE_SK': 'USER#',
        },
        KeyConditionExpression:
          '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
        Limit: 2000,
        ScanIndexForward: true,
        TableName: 'test-table',
      },
    ],
    [
      {
        ExclusiveStartKey: {
          partitionKey: 'USER#1000',
          sortKey: 'USER#1000',
        },
        ExpressionAttributeNames: {'#KY_CE_PK': 'PK', '#KY_CE_SK': 'SK'},
        ExpressionAttributeValues: {
          ':KY_CE_PK': 'USER#1',
          ':KY_CE_SK': 'USER#',
        },
        KeyConditionExpression:
          '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
        Limit: 2000,
        ScanIndexForward: true,
        TableName: 'test-table',
      },
    ],
  ]);
  expect(users.items.length).toEqual(2000);
});
