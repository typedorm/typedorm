import {table} from './../../../../__mocks__/table';
import {Entity, Table, Attribute} from '@typedorm/common';
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
    .build(table, User)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      unique: false,
    },
    {
      name: 'name',
      type: 'String',
      unique: false,
    },
    {
      name: 'status',
      type: 'String',
      unique: false,
    },
    {
      name: 'age',
      type: 'Number',
      unique: false,
    },
  ]);
});

test('builds multi type attribute metadata', () => {
  const metadata = attributesMetadataBuilder
    .build(table, UserAutoGenerateAttributes)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      unique: false,
    },
    {
      autoUpdate: true,
      name: 'updatedAt',
      strategy: 'EPOCH_DATE',
      type: 'String',
      unique: false,
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
    .build(table, Admin)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'email',
      type: 'String',
      unique: {
        partitionKey: 'USER.EMAIL#{{email}}',
        sortKey: 'USER.EMAIL#{{email}}',
      },
    },
  ]);
});
