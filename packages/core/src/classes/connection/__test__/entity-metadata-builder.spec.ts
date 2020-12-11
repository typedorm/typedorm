import {User} from '../../../../__mocks__/user';
import {EntityMetadataBuilder} from '../entity-metadata-builder';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
} from '@typedorm/common';
import {table} from '../../../../__mocks__/table';
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12-3-1-23-12'),
}));

abstract class BaseUser {
  @Attribute()
  id: string;

  @Attribute()
  name: string;
}

abstract class UserWithAccount extends BaseUser {
  @Attribute()
  username: string;

  @Attribute()
  password: string;
}

let metadataBuilder: EntityMetadataBuilder;
beforeEach(() => {
  const connection = createTestConnection({
    table,
    entities: [],
  });
  metadataBuilder = new EntityMetadataBuilder(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('builds simple entity metadata', () => {
  const [metadata] = metadataBuilder.build([User]);
  expect(metadata.schema).toEqual({
    indexes: {
      GSI1: {
        GSI1PK: 'USER#STATUS#{{status}}',
        GSI1SK: 'USER#{{name}}',
        _interpolations: {
          GSI1PK: ['status'],
          GSI1SK: ['name'],
        },
        _name: 'GSI1',
        type: 'GLOBAL_SECONDARY_INDEX',
      },
    },
    primaryKey: {
      PK: 'USER#{{id}}',
      SK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
      },
    },
  });
});

test('builds metadata of derived entity with multiple levels of inheritance', () => {
  @Entity({
    name: 'customer',
    primaryKey: {
      partitionKey: 'customer#1',
      sortKey: 'customer#1',
    },
  })
  class Customer extends UserWithAccount {
    @Attribute()
    email: string;
  }

  const [entityMetadata] = metadataBuilder.build([Customer]);
  expect(entityMetadata.attributes.map(obj => Object.assign({}, obj))).toEqual([
    {
      name: 'email',
      type: 'String',
      unique: false,
    },
    {
      name: 'password',
      type: 'String',
      unique: false,
    },
    {
      name: 'username',
      type: 'String',
      unique: false,
    },
    {
      name: 'name',
      type: 'String',
      unique: false,
    },
    {
      name: 'id',
      type: 'String',
      unique: false,
    },
  ]);
});

test('overrides property of base class if it is defined again on derived class with diff annotation', () => {
  @Entity({
    name: 'customer',
    primaryKey: {
      partitionKey: 'customer#1',
      sortKey: 'customer#1',
    },
  })
  class Customer extends UserWithAccount {
    @AutoGenerateAttribute({
      strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
    })
    username: string;
  }

  const [entityMetadata] = metadataBuilder.build([Customer]);
  expect(entityMetadata.attributes.map(obj => Object.assign({}, obj))).toEqual([
    {
      name: 'email',
      type: 'String',
      unique: false,
    },
    {
      name: 'password',
      type: 'String',
      unique: false,
    },
    {
      name: 'username',
      type: 'String',
      autoUpdate: false,
      unique: false,
      strategy: 'UUID4',
      value: '12-3-1-23-12',
    },
    {
      name: 'name',
      type: 'String',
      unique: false,
    },
    {
      name: 'id',
      type: 'String',
      unique: false,
    },
  ]);
});
