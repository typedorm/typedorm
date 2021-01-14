import {Attribute, Entity, QUERY_ORDER} from '@typedorm/common';
import {Customer} from '../../../../__mocks__/inherited-customer';
import {table} from '../../../../__mocks__/table';
import {User, UserGSI1} from '../../../../__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {UserPrimaryKey} from '../../../../__mocks__/user';
import {DocumentClientRequestTransformer} from '../document-client-request-transformer';
import {UserUniqueEmail} from '../../../../__mocks__/user-unique-email';

let transformer: DocumentClientRequestTransformer;
beforeEach(async () => {
  const connection = createTestConnection({
    entities: [User, Customer, UserUniqueEmail],
  });
  transformer = new DocumentClientRequestTransformer(connection);
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group toDynamoGetItem
 */
test('transforms get item requests', () => {
  const getItem = transformer.toDynamoGetItem<UserPrimaryKey, User>(User, {
    id: '1',
  });
  expect(getItem).toEqual({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
});

test('transforms get item requests for inherited class', () => {
  const getItem = transformer.toDynamoGetItem(Customer, {
    id: '1',
    email: 'user@example.com',
  });
  expect(getItem).toEqual({
    Key: {
      PK: 'CUS#1',
      SK: 'CUS#user@example.com',
    },
    TableName: 'test-table',
  });
});

/**
 * @group toDynamoPutItem
 */
test('transforms put item requests', () => {
  const user = new User();
  user.id = '1';
  user.name = 'Tito';
  user.status = 'active';

  const putItem = transformer.toDynamoPutItem(user);
  expect(putItem).toEqual({
    Item: {
      GSI1PK: 'USER#STATUS#active',
      GSI1SK: 'USER#Tito',
      PK: 'USER#1',
      SK: 'USER#1',
      id: '1',
      name: 'Tito',
      __en: 'user',
      status: 'active',
    },
    ConditionExpression:
      'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
    TableName: 'test-table',
  });
});

test('transforms put item request with unique attributes', () => {
  resetTestConnection();

  @Entity({
    table,
    name: 'user',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
      sortKey: 'USER#{{id}}',
    },
  })
  class UserUniqueEmail {
    @Attribute()
    id: string;

    @Attribute({
      unique: true,
    })
    email: string;
  }

  const newConnection = createTestConnection({
    entities: [UserUniqueEmail],
  });
  const newTransformer = new DocumentClientRequestTransformer(newConnection);

  const user = new UserUniqueEmail();
  user.id = '1';
  user.email = 'user@example.com';

  const putItem = newTransformer.toDynamoPutItem(user);
  expect(putItem).toEqual([
    {
      Put: {
        ConditionExpression:
          'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
        ExpressionAttributeNames: {'#CE_PK': 'PK', '#CE_SK': 'SK'},
        Item: {
          PK: 'USER#1',
          SK: 'USER#1',
          email: 'user@example.com',
          id: '1',
          __en: 'user',
        },
        TableName: 'test-table',
      },
    },
    {
      Put: {
        ConditionExpression:
          'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
        ExpressionAttributeNames: {'#CE_PK': 'PK', '#CE_SK': 'SK'},
        Item: {
          PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
          SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#user@example.com',
        },
        TableName: 'test-table',
      },
    },
  ]);
});

test('transforms put item request consisting unique attributes with provided primary key', () => {
  resetTestConnection();

  @Entity({
    table,
    name: 'user',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
      sortKey: 'USER#{{id}}',
    },
  })
  class UserUniqueEmail {
    @Attribute()
    id: string;

    @Attribute({
      unique: {
        partitionKey: 'CUSTOM#{{email}}',
        sortKey: 'CUSTOM#{{email}}',
      },
    })
    email: string;
  }

  const newConnection = createTestConnection({
    entities: [UserUniqueEmail],
  });
  const newTransformer = new DocumentClientRequestTransformer(newConnection);

  const user = new UserUniqueEmail();
  user.id = '1';
  user.email = 'user@example.com';

  const putItem = newTransformer.toDynamoPutItem(user);
  expect(putItem).toEqual([
    {
      Put: {
        ConditionExpression:
          'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
        ExpressionAttributeNames: {'#CE_PK': 'PK', '#CE_SK': 'SK'},
        Item: {
          PK: 'USER#1',
          SK: 'USER#1',
          email: 'user@example.com',
          id: '1',
          __en: 'user',
        },
        TableName: 'test-table',
      },
    },
    {
      Put: {
        ConditionExpression:
          'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
        ExpressionAttributeNames: {'#CE_PK': 'PK', '#CE_SK': 'SK'},
        Item: {
          PK: 'CUSTOM#user@example.com',
          SK: 'CUSTOM#user@example.com',
        },
        TableName: 'test-table',
      },
    },
  ]);
});

/**
 * @group toDynamoUpdateItem
 */
test('transforms update item request', () => {
  const updatedItem = transformer.toDynamoUpdateItem<UserPrimaryKey, User>(
    User,
    {
      id: '1',
    },
    {
      name: 'new name',
    }
  );
  expect(updatedItem).toEqual({
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
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
  });
});

test('transforms update item record with unique attributes', () => {
  const updatedItem = transformer.toDynamoUpdateItem<
    UserPrimaryKey,
    UserUniqueEmail
  >(
    UserUniqueEmail,
    {
      id: '1',
    },
    {
      name: 'new name',
      email: 'new@email.com',
    }
  );

  const lazyWriteItemListLoader = (updatedItem as any)
    .lazyLoadTransactionWriteItems;
  expect(typeof lazyWriteItemListLoader).toEqual('function');

  const writeItemList = lazyWriteItemListLoader({
    name: 'new name',
    email: 'old@email.com',
  });
  expect(writeItemList).toEqual([
    {
      Update: {
        ExpressionAttributeNames: {
          '#attr0': 'name',
          '#attr1': 'email',
          '#attr2': 'GSI1SK',
        },
        ExpressionAttributeValues: {
          ':val0': 'new name',
          ':val1': 'new@email.com',
          ':val2': 'USER#new name',
        },
        Key: {PK: 'USER#1', SK: 'USER#1'},
        ReturnValues: 'ALL_NEW',
        TableName: 'test-table',
        UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1, #attr2 = :val2',
      },
    },
    {
      Put: {
        ConditionExpression:
          'attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)',
        ExpressionAttributeNames: {'#CE_PK': 'PK', '#CE_SK': 'SK'},
        Item: {
          PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@email.com',
          SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#new@email.com',
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
  ]);
});

/**
 * @group toDynamoDeleteItem
 */
test('transforms delete item request', () => {
  const deleteItemInput = transformer.toDynamoDeleteItem<UserPrimaryKey, User>(
    User,
    {
      id: '1',
    }
  );
  expect(deleteItemInput).toEqual({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
  });
});

/**
 * @group toDynamoQueryItem
 */
test('transforms simple query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<UserPrimaryKey, User>(User, {
    id: '1',
  });
  expect(queryItem).toEqual({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#1',
    },
    KeyConditionExpression: '#KY_CE_PK = :KY_CE_PK',
    TableName: 'test-table',
  });
});

test('transforms complex query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<UserPrimaryKey, User>(
    User,
    {
      id: '1',
    },
    {
      keyCondition: {
        BEGINS_WITH: 'USER#',
      },
      limit: 12,
      orderBy: QUERY_ORDER.DESC,
    }
  );
  expect(queryItem).toEqual({
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
    Limit: 12,
    ScanIndexForward: false,
    TableName: 'test-table',
  });
});

test('transforms index based query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<UserGSI1, User>(
    User,
    {
      status: '13',
      queryIndex: 'GSI1',
    },
    {
      keyCondition: {
        BETWEEN: ['jay', 'joe'],
      },
      orderBy: QUERY_ORDER.ASC,
    }
  );
  expect(queryItem).toEqual({
    TableName: 'test-table',
    ExpressionAttributeNames: {
      '#KY_CE_GSI1PK': 'GSI1PK',
      '#KY_CE_GSI1SK': 'GSI1SK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_GSI1PK': 'USER#STATUS#13',
      ':KY_CE_GSI1SK_end': 'joe',
      ':KY_CE_GSI1SK_start': 'jay',
    },
    IndexName: 'GSI1',
    KeyConditionExpression:
      '#KY_CE_GSI1PK = :KY_CE_GSI1PK AND #KY_CE_GSI1SK BETWEEN :KY_CE_GSI1SK_start AND :KY_CE_GSI1SK_end',
    ScanIndexForward: true,
  });
});

test('errors when querying unknown index', () => {
  expect(() =>
    transformer.toDynamoQueryItem(
      User,
      {
        status: '13',
        queryIndex: 'LSI1',
      },
      {
        keyCondition: {
          EQ: 'joe',
        },
      }
    )
  ).toThrowError(
    'Requested to query items from index "LSI1", but no such index exists on entity.'
  );
});
