import {INDEX_TYPE} from '@typedorm/common';
import {Attribute} from '@typedorm/common/decorators/attribute.decorator';
import {Entity} from '@typedorm/common/decorators/entity.decorator';
import {Organisation} from '@typedorm/core/__mocks__/organisation';
import {User} from '@typedorm/core/__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Table} from '@typedorm/common/table';
import {EntityTransformer} from '../entity-transformer';

let transformer: EntityTransformer;
beforeEach(() => {
  const connection = createTestConnection({
    entities: [User, Organisation],
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
