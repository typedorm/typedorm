import {UserUniqueEmail} from './../../../../__mocks__/user-unique-email';
import {table} from './../../../../__mocks__/table';
import {
  Entity,
  Table,
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
} from '@typedorm/common';
import {UserAutoGenerateAttributes} from '../../../../__mocks__/user-auto-generate-attributes';
import {User} from '../../../../__mocks__/user';
import {AttributesMetadataBuilder} from '../attribute-metadata-builder';

jest.useFakeTimers('modern').setSystemTime(new Date('2020-10-10'));

let attributesMetadataBuilder: AttributesMetadataBuilder;
beforeEach(() => {
  attributesMetadataBuilder = new AttributesMetadataBuilder();
});

test('builds simple attribute metadata', () => {
  const metadata = attributesMetadataBuilder
    .build(table, User, User)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      entityClass: User,
      table,
    },
    {
      name: 'name',
      type: 'String',
      entityClass: User,
      table,
    },
    {
      name: 'status',
      type: 'String',
      entityClass: User,
      table,
    },
    {
      name: 'age',
      type: 'Number',
      entityClass: User,
      table,
    },
  ]);
});

test('builds attribute metadata for inherited entity', () => {
  @Entity({
    name: 'admin',
    primaryKey: {
      partitionKey: 'ADMIN#{{id}}',
      sortKey: 'ADMIN#{{id}}',
    },
  })
  class Admin extends User {}

  const metadata = attributesMetadataBuilder
    .build(table, User, Admin)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      entityClass: Admin,
      table,
    },
    {
      name: 'name',
      type: 'String',
      entityClass: Admin,
      table,
    },
    {
      name: 'status',
      type: 'String',
      entityClass: Admin,
      table,
    },
    {
      name: 'age',
      type: 'Number',
      entityClass: Admin,
      table,
    },
  ]);
});

test('builds multi type attribute metadata', () => {
  const metadata = attributesMetadataBuilder
    .build(table, UserAutoGenerateAttributes, UserAutoGenerateAttributes)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      table,
      entityClass: UserAutoGenerateAttributes,
    },
    {
      autoUpdate: true,
      name: 'updatedAt',
      strategy: 'EPOCH_DATE',
      type: 'String',
    },
  ]);
});

test('builds metadata for attribute with explicit entity', () => {
  const demoTable = new Table({
    name: 'demo-table',
    partitionKey: 'PK',
  });
  @Entity({
    table: demoTable,
    name: 'admin',
    primaryKey: {
      partitionKey: 'ADMIN#{{name}}',
    },
  })
  class Admin {
    @Attribute({
      unique: {
        partitionKey: 'USER.EMAIL#{{email}}',
        sortKey: 'USER.EMAIL#{{email}}',
      },
    })
    email: string;
  }

  const metadata = attributesMetadataBuilder
    .build(table, Admin, Admin)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'email',
      type: 'String',
      entityClass: Admin,
      table,
      unique: {
        PK: 'USER.EMAIL#{{email}}',
        SK: 'USER.EMAIL#{{email}}',
        _interpolations: {
          PK: ['email'],
          SK: ['email'],
        },
      },
    },
  ]);
});

test('builds metadata with implicit primary key for unique attribute', () => {
  const metadata = attributesMetadataBuilder
    .build(table, UserUniqueEmail, UserUniqueEmail)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      entityClass: UserUniqueEmail,
      table,
    },
    {
      name: 'name',
      type: 'String',
      entityClass: UserUniqueEmail,
      table,
    },
    {
      name: 'status',
      type: 'String',
      entityClass: UserUniqueEmail,
      table,
    },
    {
      name: 'email',
      type: 'String',
      entityClass: UserUniqueEmail,
      table,
      unique: {
        PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#{{email}}',
        SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#{{email}}',
        _interpolations: {
          PK: ['email'],
          SK: ['email'],
        },
      },
    },
  ]);
});

test('throws an error when attribute referenced in primary key is also marked as "autoUpdate"', () => {
  @Entity({
    name: 'admin',
    table,
    primaryKey: {
      partitionKey: 'ADMIN#{{adminId}}',
      sortKey: 'ADMIN#{{adminId}}',
    },
  })
  class Admin extends User {
    @AutoGenerateAttribute({
      strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
      autoUpdate: true,
    })
    adminId: string;
  }

  const metadata = () =>
    attributesMetadataBuilder
      .build(table, Admin, User)
      .map(obj => Object.assign({}, obj));

  expect(metadata).toThrow(
    'Failed to build metadata for "adminId", attributes referenced in primary key cannot be auto updated.'
  );
});
