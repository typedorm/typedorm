import {UserUniqueEmail} from './../../../../__mocks__/user-unique-email';
import {table} from './../../../../__mocks__/table';
import {
  Entity,
  Table,
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  ConflictingAttributeNameError,
} from '@typedorm/common';
import {UserAutoGenerateAttributes} from '../../../../__mocks__/user-auto-generate-attributes';
import {User} from '../../../../__mocks__/user';
import {AttributesMetadataBuilder} from '../attribute-metadata-builder';

jest.useFakeTimers().setSystemTime(new Date('2020-10-10'));

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
    {
      entityClass: User,
      type: 'Array',
      name: 'addresses',
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
    {
      entityClass: Admin,
      type: 'Array',
      name: 'addresses',
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
        attributes: {
          PK: 'USER.EMAIL#{{email}}',
          SK: 'USER.EMAIL#{{email}}',
        },
        metadata: {
          _interpolations: {
            PK: ['email'],
            SK: ['email'],
          },
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
        attributes: {
          PK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#{{email}}',
          SK: 'DRM_GEN_USERUNIQUEEMAIL.EMAIL#{{email}}',
        },
        metadata: {
          _interpolations: {
            PK: ['email'],
            SK: ['email'],
          },
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

test('throws an error when attribute name conflicts with a primary key or sort key name of the table ', () => {
  const mockTable = new Table({
    name: 'admin-table',
    partitionKey: 'id',
  });
  @Entity({
    name: 'admin-test',
    table: mockTable,
    primaryKey: {
      partitionKey: 'ADMIN#{{id}}',
    },
  })
  class AdminTest {
    @AutoGenerateAttribute({
      strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.KSUID,
    })
    id: string;
  }

  const metadata = () =>
    attributesMetadataBuilder
      .build(mockTable, AdminTest, AdminTest)
      .map(obj => Object.assign({}, obj));
  expect(metadata).toThrow(ConflictingAttributeNameError);
});
