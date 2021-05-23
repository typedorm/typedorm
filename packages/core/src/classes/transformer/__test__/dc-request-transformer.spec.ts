import {Attribute, Entity, QUERY_ORDER} from '@typedorm/common';
import {Customer} from '../../../../__mocks__/inherited-customer';
import {table} from '../../../../__mocks__/table';
import {User, UserGSI1} from '../../../../__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {UserPrimaryKey} from '../../../../__mocks__/user';
import {DocumentClientRequestTransformer} from '../document-client-request-transformer';
import {
  UserUniqueEmail,
  UserUniqueEmailPrimaryKey,
} from '../../../../__mocks__/user-unique-email';

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
  const getItem = transformer.toDynamoGetItem<User, UserPrimaryKey>(User, {
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

test('transforms get item requests with projection expression', () => {
  const getItem = transformer.toDynamoGetItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      select: ['name'],
    }
  );
  expect(getItem).toEqual({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    ExpressionAttributeNames: {
      '#PE_name': 'name',
    },
    ProjectionExpression: '#PE_name',
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
      '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
    TableName: 'test-table',
  });
});

test('transforms put item requests with condition', () => {
  const user = new User();
  user.id = '1';
  user.name = 'Tito';
  user.status = 'active';

  const putItem = transformer.toDynamoPutItem(user, {
    where: {
      status: {
        EQ: 'active',
      },
    },
  });
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
      '((attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))) AND (#CE_status = :CE_status)',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
      '#CE_status': 'status',
    },
    ExpressionAttributeValues: {
      ':CE_status': 'active',
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
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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

test('transforms put item request with unique attributes and condition options', () => {
  const user = new UserUniqueEmail();
  user.id = '1';
  user.email = 'user@example.com';
  user.name = 'test user';
  user.status = 'active';

  const putItem = transformer.toDynamoPutItem(user, {
    where: {
      status: 'ATTRIBUTE_NOT_EXISTS',
    },
  });
  expect(putItem).toEqual([
    {
      Put: {
        ConditionExpression:
          '((attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))) AND (attribute_not_exists(#CE_status))',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
          '#CE_SK': 'SK',
          '#CE_status': 'status',
        },
        Item: {
          PK: 'USER#1',
          SK: 'USER#1',
          email: 'user@example.com',
          id: '1',
          name: 'test user',
          status: 'active',
          __en: 'user',
          GSI1PK: 'USER#STATUS#active',
          GSI1SK: 'USER#test user',
        },
        TableName: 'test-table',
      },
    },
    {
      Put: {
        ConditionExpression:
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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

test('transforms put item request with default values ', () => {
  resetTestConnection();

  @Entity({
    table,
    name: 'product',
    primaryKey: {
      partitionKey: 'PRD#{{id}}',
      sortKey: 'PRD#{{id}}',
    },
  })
  class Product {
    @Attribute()
    id: string;

    @Attribute({
      default: () => 'available',
    })
    status: string;
  }

  const newConnection = createTestConnection({
    entities: [Product],
  });
  const newTransformer = new DocumentClientRequestTransformer(newConnection);

  const product = new Product();
  product.id = '1';

  const putItem = newTransformer.toDynamoPutItem(product);
  expect(putItem).toEqual({
    ConditionExpression:
      '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
    Item: {
      PK: 'PRD#1',
      SK: 'PRD#1',
      __en: 'product',
      id: '1',
      status: 'available',
    },
    TableName: 'test-table',
  });

  // when overriding item, this can
  product.status = 'unavailable';
  const overriddenPutItem = newTransformer.toDynamoPutItem(product) as any;
  expect(overriddenPutItem.Item.status).toEqual('unavailable');
});

test('transforms put item request with dynamic default values ', () => {
  resetTestConnection();

  @Entity({
    table,
    name: 'person',
    primaryKey: {
      partitionKey: 'PER#{{id}}',
      sortKey: 'PER#{{id}}',
    },
  })
  class Person {
    @Attribute()
    id: string;

    @Attribute()
    firstName: string;

    @Attribute()
    lastName: string;

    @Attribute<Person>({
      default: person => `${person.firstName} ${person.lastName}`,
    })
    name: string;
  }

  const newConnection = createTestConnection({
    entities: [Person],
  });
  const newTransformer = new DocumentClientRequestTransformer(newConnection);

  const person = new Person();
  person.id = '1';
  person.firstName = 'Rushi';
  person.lastName = 'Patel';

  const putItem = newTransformer.toDynamoPutItem(person);
  expect(putItem).toEqual({
    ConditionExpression:
      '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
    Item: {
      PK: 'PER#1',
      SK: 'PER#1',
      __en: 'person',
      id: '1',
      name: 'Rushi Patel',
      firstName: 'Rushi',
      lastName: 'Patel',
    },
    TableName: 'test-table',
  });
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
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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
  const updatedItem = transformer.toDynamoUpdateItem<User, UserPrimaryKey>(
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
    UserUniqueEmail,
    UserPrimaryKey
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
        TableName: 'test-table',
        UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1, #attr2 = :val2',
      },
    },
    {
      Put: {
        ConditionExpression:
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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

test('transforms update item request with condition input', () => {
  const updatedItem = transformer.toDynamoUpdateItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      name: 'new name',
    },
    {
      where: {
        age: {
          BETWEEN: [3, 10],
        },
      },
    }
  );
  expect(updatedItem).toEqual({
    ExpressionAttributeNames: {
      '#attr0': 'name',
      '#attr1': 'GSI1SK',
      '#CE_age': 'age',
    },
    ExpressionAttributeValues: {
      ':val0': 'new name',
      ':val1': 'USER#new name',
      ':CE_age_end': 10,
      ':CE_age_start': 3,
    },
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
    ConditionExpression: '#CE_age BETWEEN :CE_age_start AND :CE_age_end',
  });
});

test('transforms update item record with unique attributes and condition options', () => {
  const updatedItem = transformer.toDynamoUpdateItem<
    UserUniqueEmail,
    UserPrimaryKey
  >(
    UserUniqueEmail,
    {
      id: '1',
    },
    {
      name: 'new name',
      email: 'new@email.com',
    },
    {
      where: {
        'user.name': {
          NE: 'test user',
        },
      },
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
          '#CE_user': 'user',
          '#CE_user_name': 'name',
        },
        ExpressionAttributeValues: {
          ':val0': 'new name',
          ':val1': 'new@email.com',
          ':val2': 'USER#new name',
          ':CE_user_name': 'test user',
        },
        Key: {PK: 'USER#1', SK: 'USER#1'},
        TableName: 'test-table',
        UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1, #attr2 = :val2',
        ConditionExpression: '#CE_user.#CE_user_name <> :CE_user_name',
      },
    },
    {
      Put: {
        ConditionExpression:
          '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
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

test('transforms update item request with complex condition input', () => {
  const updatedItem = transformer.toDynamoUpdateItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      name: 'new name',
    },
    {
      where: {
        AND: {
          age: {
            GE: 3,
          },
          status: {
            IN: ['active', 'standby'],
          },
        },
      },
    }
  );
  expect(updatedItem).toEqual({
    ExpressionAttributeNames: {
      '#attr0': 'name',
      '#attr1': 'GSI1SK',
      '#CE_age': 'age',
      '#CE_status': 'status',
    },
    ExpressionAttributeValues: {
      ':val0': 'new name',
      ':val1': 'USER#new name',
      ':CE_age': 3,
      ':CE_status_0': 'active',
      ':CE_status_1': 'standby',
    },
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
    ConditionExpression:
      '(#CE_age >= :CE_age) AND (#CE_status IN (:CE_status_0, :CE_status_1))',
  });
});

/**
 * @group toDynamoDeleteItem
 */
test('transforms delete item request', () => {
  const deleteItemInput = transformer.toDynamoDeleteItem<User, UserPrimaryKey>(
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

test('transforms delete item request with condition options', () => {
  const deleteItemInput = transformer.toDynamoDeleteItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      where: {
        age: {
          BETWEEN: [1, 9],
        },
      },
    }
  );
  expect(deleteItemInput).toEqual({
    Key: {
      PK: 'USER#1',
      SK: 'USER#1',
    },
    TableName: 'test-table',
    ConditionExpression: '#CE_age BETWEEN :CE_age_start AND :CE_age_end',
    ExpressionAttributeNames: {
      '#CE_age': 'age',
    },
    ExpressionAttributeValues: {
      ':CE_age_end': 9,
      ':CE_age_start': 1,
    },
  });
});

test('transforms delete item request with unique attributes', () => {
  const deleteItemInput = transformer.toDynamoDeleteItem<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >(UserUniqueEmail, {
    id: '1',
  });
  expect(deleteItemInput).toMatchObject({
    entityClass: UserUniqueEmail,
    primaryKeyAttributes: {
      id: '1',
    },
  });

  const lazyWriteItemListLoader = (deleteItemInput as any)
    .lazyLoadTransactionWriteItems;

  expect(typeof lazyWriteItemListLoader).toEqual('function');

  const deleteItemList = lazyWriteItemListLoader({
    id: '1',
    name: 'new name',
    email: 'old@email.com',
  });

  expect(deleteItemList).toEqual([
    {
      Delete: {
        TableName: 'test-table',
        Key: {
          PK: 'USER#1',
          SK: 'USER#1',
        },
      },
    },
    {
      Delete: {
        TableName: 'test-table',
        Key: {
          PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
          SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
        },
      },
    },
  ]);
});

test('transforms delete item request with unique attributes and condition options', () => {
  const deleteItemInput = transformer.toDynamoDeleteItem<
    UserUniqueEmail,
    UserUniqueEmailPrimaryKey
  >(
    UserUniqueEmail,
    {
      id: '1',
    },
    {
      where: {
        email: {
          NE: 'admin@user.com',
        },
      },
    }
  );
  expect(deleteItemInput).toMatchObject({
    entityClass: UserUniqueEmail,
    primaryKeyAttributes: {
      id: '1',
    },
  });

  const lazyWriteItemListLoader = (deleteItemInput as any)
    .lazyLoadTransactionWriteItems;

  expect(typeof lazyWriteItemListLoader).toEqual('function');

  const deleteItemList = lazyWriteItemListLoader({
    id: '1',
    name: 'new name',
    email: 'old@email.com',
  });

  expect(deleteItemList).toEqual([
    {
      Delete: {
        TableName: 'test-table',
        Key: {
          PK: 'USER#1',
          SK: 'USER#1',
        },
        ConditionExpression: '#CE_email <> :CE_email',
        ExpressionAttributeNames: {
          '#CE_email': 'email',
        },
        ExpressionAttributeValues: {
          ':CE_email': 'admin@user.com',
        },
      },
    },
    {
      Delete: {
        TableName: 'test-table',
        Key: {
          PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
          SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#old@email.com',
        },
      },
    },
  ]);
});

/**
 * @group toDynamoQueryItem
 */
test('transforms simple query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<User, UserPrimaryKey>(User, {
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

test('transforms simple query item request with projection expression', () => {
  const queryItem = transformer.toDynamoQueryItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      select: ['status', 'name'],
    }
  );
  expect(queryItem).toEqual({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#PE_name': 'name',
      '#PE_status': 'status',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#1',
    },
    ScanIndexForward: true,
    KeyConditionExpression: '#KY_CE_PK = :KY_CE_PK',
    TableName: 'test-table',
    ProjectionExpression: '#PE_status, #PE_name',
  });
});

test('transforms simple count query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      onlyCount: true,
    }
  );
  expect(queryItem).toEqual({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#1',
    },
    ScanIndexForward: true,
    KeyConditionExpression: '#KY_CE_PK = :KY_CE_PK',
    TableName: 'test-table',
    Select: 'COUNT',
  });
});

test('transforms query item request with filter input', () => {
  const queryItem = transformer.toDynamoQueryItem<User, UserPrimaryKey>(
    User,
    {
      id: '1',
    },
    {
      where: {
        name: {
          EQ: 'suzan',
        },
      },
    }
  );
  expect(queryItem).toEqual({
    ExpressionAttributeNames: {
      '#KY_CE_PK': 'PK',
      '#FE_name': 'name',
    },
    ExpressionAttributeValues: {
      ':KY_CE_PK': 'USER#1',
      ':FE_name': 'suzan',
    },
    ScanIndexForward: true,
    KeyConditionExpression: '#KY_CE_PK = :KY_CE_PK',
    FilterExpression: '#FE_name = :FE_name',
    TableName: 'test-table',
  });
});

test('transforms complex query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<User, UserPrimaryKey>(
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
      '(#KY_CE_PK = :KY_CE_PK) AND (begins_with(#KY_CE_SK, :KY_CE_SK))',
    Limit: 12,
    ScanIndexForward: false,
    TableName: 'test-table',
  });
});

test('transforms index based query item request', () => {
  const queryItem = transformer.toDynamoQueryItem<User, UserGSI1>(
    User,
    {
      status: '13',
    },
    {
      queryIndex: 'GSI1',
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
      '(#KY_CE_GSI1PK = :KY_CE_GSI1PK) AND (#KY_CE_GSI1SK BETWEEN :KY_CE_GSI1SK_start AND :KY_CE_GSI1SK_end)',
    ScanIndexForward: true,
  });
});

test('errors when querying unknown index', () => {
  expect(() =>
    transformer.toDynamoQueryItem(
      User,
      {
        status: '13',
      },
      {
        queryIndex: 'LSI1',
        keyCondition: {
          EQ: 'joe',
        },
      }
    )
  ).toThrowError(
    'Requested to query items from index "LSI1", but no such index exists on entity.'
  );
});
