import {UserAutoGenerateAttributes} from '../../../../__mocks__/user-auto-generate-attributes';
import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
  INDEX_TYPE,
  Table,
} from '@typedorm/common';
import {Organisation} from '../../../../__mocks__/organisation';
import {User} from '../../../../__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityTransformer} from '../entity-transformer';
import {UserSparseIndexes} from '../../../../__mocks__/user-sparse-indexes';
import {table} from '@typedorm/core/__mocks__/table';
import {UserAttrAlias} from '@typedorm/core/__mocks__/user-with-attribute-alias';
import {CATEGORY, Photo} from '@typedorm/core/__mocks__/photo';
// Moment is only being used here to display the usage of @transform utility
// eslint-disable-next-line node/no-extraneous-import
import moment from 'moment';

jest.mock('uuid', () => ({
  v4: () => 'c0ac5395-ba7c-41bf-bbc3-09a6087bcca2',
}));

let transformer: EntityTransformer;
beforeEach(() => {
  const connection = createTestConnection({
    entities: [
      User,
      Organisation,
      UserAutoGenerateAttributes,
      UserSparseIndexes,
      UserAttrAlias,
      Photo,
    ],
  });
  transformer = new EntityTransformer(connection);
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group fromDynamoEntity
 */
test('transforms dynamo entity to entity model', () => {
  const dynamoEntity = {
    PK: 'USER#1',
    SK: 'USER#1',
    GSI1PK: 'USER#STATUS#active',
    GSI1SK: 'USER#Me',
    id: '1',
    name: 'Me',
    status: 'active',
  };
  const transformed = transformer.fromDynamoEntity(User, dynamoEntity);
  expect(transformed).toEqual({
    id: '1',
    name: 'Me',
    status: 'active',
  });
});

test('transforms dynamo entity with aliased attributes to entity model', () => {
  const dynamoEntity = {
    PK: 'USER#1',
    SK: 'USER#1',
    GSI1PK: 'USER#STATUS#active',
    GSI1SK: 'USER#Me',
    id: '1',
    name: 'Me',
    age: 1,
  };
  const transformed = transformer.fromDynamoEntity(
    UserSparseIndexes,
    dynamoEntity
  );
  expect(transformed).toEqual({
    id: '1',
    name: 'Me',
    age: 1,
  });
});

test('transforms inherited dynamo entity to entity model', () => {
  const dynamoEntity = {
    PK: 'CUS#1',
    SK: 'CUS#user@example.com',
    id: '1',
    name: 'Me',
    username: 'i-am-user',
    password: 'password',
    email: 'user@example.com',
    loyaltyPoints: 97,
  };
  const transformed = transformer.fromDynamoEntity(User, dynamoEntity);
  expect(transformed).toEqual({
    id: '1',
    name: 'Me',
    email: 'user@example.com',
    loyaltyPoints: 97,
    password: 'password',
    username: 'i-am-user',
  });
});

test('excludes internal attributes from transformed object', () => {
  const dynamoEntity = {
    PK: 'CUS#1',
    SK: 'CUS#user@example.com',
    id: '1',
    name: 'Me',
    __en: 'user',
  };
  const transformed = transformer.fromDynamoEntity(User, dynamoEntity);
  expect(transformed).toEqual({
    id: '1',
    name: 'Me',
  });
});

test('excludes hidden props from returned response', () => {
  @Entity({
    name: 'user-priv',
    table,
    primaryKey: {
      partitionKey: 'USER#{{id}}',
      sortKey: 'USER#{{id}}',
    },
  })
  class UserPriv {
    @Attribute()
    id: string;

    @Attribute()
    username: string;

    @Attribute({
      hidden: true,
    })
    password: string;

    @AutoGenerateAttribute({
      strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
      hidden: true,
    })
    createdAt: string;
  }
  transformer = new EntityTransformer(
    createTestConnection({
      entities: [UserPriv],
      name: 'temp-hidden-props',
    })
  );

  const dynamoEntity = {
    PK: 'USER#1',
    id: '1',
    username: 'Me@21',
    password: '12344',
    createdAt: '13123123123',
    __en: 'user-priv',
  };
  const transformed = transformer.fromDynamoEntity(UserPriv, dynamoEntity);
  expect(transformed).toEqual({
    id: '1',
    username: 'Me@21',
  });
});

test('transforms photo dynamo item to entity model instance ', () => {
  const dynamoEntity = {
    PK: 'PHOTO#PETS',
    SK: 'PHOTO#1',
    id: 1,
    category: 'PETS',
    name: 'my cute pet billy',
    GSI1PK: 'PHOTO#c0ac5395-ba7c-41bf-bbc3-09a6087bcca2',
    GSI1SK: 'PHOTO#kids-new',
    createdAt: '2020-03-21T03:26:34.781Z',
  };
  const transformed = transformer.fromDynamoEntity(Photo, dynamoEntity);
  expect(transformed).toMatchObject({
    category: 'PETS',
    createdAt: expect.any(moment),
    id: 1,
    name: 'my cute pet billy',
  });
  expect(transformed).toBeInstanceOf(Photo);
  expect(transformed.createdDate()).toEqual('03-21-2020');
});

/**
 * @group toDynamoEntity
 */
test('transforms simple model to dynamo entity', () => {
  const user = new User();
  user.id = '111';
  user.name = 'Test User';
  user.status = 'inactive';

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    GSI1PK: 'USER#STATUS#inactive',
    GSI1SK: 'USER#Test User',
    PK: 'USER#111',
    SK: 'USER#111',
    id: '111',
    name: 'Test User',
    status: 'inactive',
  });
});

test('transforms photo dynamo entity to entity model instance ', () => {
  const photo = new Photo(CATEGORY.KIDS, 'my baby');

  const response = transformer.toDynamoEntity(photo);

  expect(response).toEqual({
    PK: 'PHOTO#kids-new',
    SK: 'PHOTO#c0ac5395-ba7c-41bf-bbc3-09a6087bcca2',
    GSI1PK: 'PHOTO#c0ac5395-ba7c-41bf-bbc3-09a6087bcca2',
    GSI1SK: 'PHOTO#kids-new',
    category: 'kids-new',
    id: 'c0ac5395-ba7c-41bf-bbc3-09a6087bcca2',
    name: 'my baby',
  });
});

test('transforms entity with attribute alias to dynamo entity', () => {
  const user = new UserAttrAlias();
  user.id = '111';
  user.name = 'Test User';
  user.status = 'inactive';
  user.age = 10;

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    GSI1PK: 'inactive',
    GSI1SK: 'USER#Test User',
    PK: 'USER#111',
    SK: 'USER#111',
    LSI1SK: 10, // <-- aliased indexes are correctly persisting attribute types
    age: 10,
    id: '111',
    name: 'Test User',
    status: 'inactive',
  });
});

test('transforms entity with attribute alias to dynamo entity', () => {
  const user = new UserAttrAlias();
  user.id = '111';

  user.age = 10;

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    PK: 'USER#111',
    SK: 'USER#111',
    LSI1SK: 10, // <-- aliased indexes are correctly persisting attribute types
    age: 10,
    id: '111',
  });
});

test('transforms entity with sparse index when variable referenced in sort key is missing a value', () => {
  const user = new UserSparseIndexes();
  user.id = '111';
  user.status = 'active';

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    PK: 'USER_SPARSE_INDEXES#111',
    SK: 'USER_SPARSE_INDEXES#111',
    id: '111',
    status: 'active',
  });
});

test('transforms entity with sparse LSI index when variable referenced is missing a value', () => {
  const user = new UserSparseIndexes();
  user.id = '111';

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    PK: 'USER_SPARSE_INDEXES#111',
    SK: 'USER_SPARSE_INDEXES#111',
    id: '111',
  });
});

/**
 * Issue #37
 */
test('transforms simple model with auto generated values to dynamo entity', () => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-10-10'));

  const user = new UserAutoGenerateAttributes();
  user.id = '111';

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    GSI1PK: 'USER#UPDATED_AT#1602288000',
    GSI1SK: 'USER#111',
    PK: 'USER#111',
    SK: 'USER#111',
    id: '111',
    updatedAt: 1602288000,
  });
});

test('transforms complex model model to dynamo entity', () => {
  resetTestConnection();
  const table = new Table({
    name: 'user-table',
    partitionKey: 'PK',
    sortKey: 'SK',
    indexes: {
      GSI1: {
        partitionKey: 'GSI1PK',
        sortKey: 'GSI1SK',
        type: INDEX_TYPE.GSI,
      },
      GSI2: {
        partitionKey: 'GSI2PK',
        sortKey: 'GSI2SK',
        type: INDEX_TYPE.GSI,
      },
      LSI1: {
        sortKey: 'LSI1SK',
        type: INDEX_TYPE.LSI,
      },
    },
  });

  @Entity({
    name: 'User',
    primaryKey: {
      partitionKey: 'USER#{{id}}#NAME#{{name}}',
      sortKey: 'USER#{{id}}',
    },
    indexes: {
      GSI1: {
        partitionKey: 'USER#{{id}}#AGE#{{age}}',
        sortKey: 'USER#{{name}}',
        type: INDEX_TYPE.GSI,
      },
      LSI1: {
        sortKey: 'USER#{{id}}',
        type: INDEX_TYPE.LSI,
      },
    },
    table,
  })
  class ComplexUser {
    @Attribute()
    id: string;

    @Attribute()
    name: string;

    @Attribute()
    age: number;
  }

  const connection = createTestConnection({
    entities: [ComplexUser],
  });

  transformer = new EntityTransformer(connection);

  const user = new ComplexUser();
  user.id = '111';
  user.name = 'Test User';
  user.age = 12;

  const response = transformer.toDynamoEntity(user);
  expect(response).toEqual({
    id: '111',
    GSI1PK: 'USER#111#AGE#12',
    GSI1SK: 'USER#Test User',
    LSI1SK: 'USER#111',
    PK: 'USER#111#NAME#Test User',
    SK: 'USER#111',
    name: 'Test User',
    age: 12,
  });
});

/**
 * @group getAffectedIndexesForAttributes
 */
test('returns all affected indexes for simple attributes', () => {
  const affectedIndexes = transformer.getAffectedIndexesForAttributes(User, {
    name: 'new updated name',
  });
  expect(affectedIndexes).toEqual({
    GSI1SK: 'USER#new updated name',
  });
});

test('returns all affected indexes for alias attributes', () => {
  const affectedIndexes = transformer.getAffectedIndexesForAttributes(
    UserAttrAlias,
    {
      age: 10,
      status: 'inactive',
    }
  );
  expect(affectedIndexes).toEqual({
    LSI1SK: 10, // <-- aliased indexes are correctly persisting attribute types
    GSI1PK: 'inactive',
  });
});

test('returns all affected indexes for complex attributes', () => {
  const affectedIndexes = transformer.getAffectedIndexesForAttributes(
    Organisation,
    {
      name: 'Updated name',
      teamCount: 12,
      active: false,
    }
  );
  expect(affectedIndexes).toEqual({
    GSI1SK: 'ORG#Updated name#ACTIVE#false',
    GSI2SK: 'ORG#Updated name#TEAM_COUNT#12',
  });
});

/**
 * @group fromDynamoKeyToAttributes
 */
test('reverse transforms key schema to attributes', () => {
  const attributes = transformer.fromDynamoKeyToAttributes(User, {
    PK: 'USER#12',
    SK: 'USER#12',
  });

  expect(attributes).toEqual({
    id: '12',
  });
});

test('safely fails to transform key for unknown entity ', () => {
  const attributes = transformer.fromDynamoKeyToAttributes(User, {
    PK: 'OTHERsUSER#12',
    SK: 'OTHER_USER#12',
  });

  expect(attributes).toEqual({});
});

test('reverse transforms key schema to attributes with proper value types', () => {
  resetTestConnection();

  @Entity({
    name: 'other-user',
    primaryKey: {
      partitionKey: 'USER#{{id}}#active#{{active}}',
      sortKey: 'USER#{{id}}',
    },
    table,
  })
  class ComplexUser {
    @Attribute()
    id: number;

    @Attribute()
    name: string;

    @Attribute()
    age: number;

    @Attribute()
    active: boolean;
  }

  const connection = createTestConnection({
    entities: [ComplexUser],
  });

  transformer = new EntityTransformer(connection);

  const attributes = transformer.fromDynamoKeyToAttributes(ComplexUser, {
    PK: 'USER#12#active#true',
    SK: 'USER#12',
  });

  expect(attributes).toEqual({
    id: 12,
    active: true,
  });
});
