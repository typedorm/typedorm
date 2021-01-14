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

let manager: EntityManager;
const dcMock = {
  put: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
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

  const userEntity = await manager.create(user);
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
    ConditionExpression:
      'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
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
      'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
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

  const userEntity = await manager.findOne<UserPrimaryKey, User>(User, {
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

test('throws an error when trying to do a get request with non primary key attributes', async () => {
  await expect(
    manager.findOne(User, {
      name: 'User',
    })
  ).rejects.toThrowError('Could not resolve "id" from given dictionary');
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
    }
  );

  expect(dcMock.get).toHaveBeenCalledWith({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
  expect(userEntity).toEqual(true);
});

test('checks if item with given unique attribute exists', async () => {
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
  ).rejects.toThrowError('Could not resolve "id" from given dictionary');
});

/**
 * @group update
 */
test('updates item', async () => {
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
  const updatedItem = await manager.update<UserPrimaryKey, User>(
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
  expect(updatedItem).toEqual({id: '1', name: 'Me', status: 'active'});
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
    UserAutoGenerateAttributesPrimaryKey,
    UserAutoGenerateAttributes
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

/**
 * @group delete
 */
test('deletes item by primary key', async () => {
  dcMock.delete.mockReturnValue({
    promise: jest.fn().mockReturnValue({
      Attributes: {},
    }),
  });

  const result = await manager.delete<UserPrimaryKey, User>(User, {
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

test('throws an error when trying to delete item by non primary key attributes', async () => {
  await expect(
    manager.delete(User, {
      name: 'User',
    })
  ).rejects.toThrowError('Could not resolve "id" from given dictionary');
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
      '#KY_CE_PK = :KY_CE_PK AND begins_with(#KY_CE_SK, :KY_CE_SK)',
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
      '#KY_CE_PK = :KY_CE_PK AND begins_with(#KY_CE_SK, :KY_CE_SK)',
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
          '#KY_CE_PK = :KY_CE_PK AND begins_with(#KY_CE_SK, :KY_CE_SK)',
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
          '#KY_CE_PK = :KY_CE_PK AND begins_with(#KY_CE_SK, :KY_CE_SK)',
        Limit: 2000,
        ScanIndexForward: true,
        TableName: 'test-table',
      },
    ],
  ]);
  expect(users.items.length).toEqual(2000);
});
