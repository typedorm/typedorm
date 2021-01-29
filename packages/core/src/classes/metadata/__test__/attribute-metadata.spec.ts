import {User} from './../../../../__mocks__/user';
import {table} from './../../../../__mocks__/table';
import {AttributeMetadata} from '../attribute-metadata';
import {AttributeMetadataUnsupportedDefaultValueError} from '@typedorm/common';

test('attribute has required metadata', () => {
  const attMetadata = new AttributeMetadata({
    name: 'id',
    type: 'String',
    table,
    entityClass: User,
  });

  expect(attMetadata).toBeTruthy();
  expect(Object.assign({}, attMetadata)).toEqual({
    entityClass: User,
    table,
    name: 'id',
    type: 'String',
  });
});

test('unique attribute has required metadata', () => {
  const attrMetadata = new AttributeMetadata({
    name: 'id',
    type: 'String',
    table,
    entityClass: User,
    unique: true,
  });

  expect(attrMetadata).toBeTruthy();
  expect(Object.assign({}, attrMetadata)).toEqual({
    entityClass: User,
    table,
    name: 'id',
    type: 'String',
    unique: {
      attributes: {
        PK: 'DRM_GEN_USER.ID#{{id}}',
        SK: 'DRM_GEN_USER.ID#{{id}}',
      },
      metadata: {
        _interpolations: {
          PK: ['id'],
          SK: ['id'],
        },
      },
    },
  });
});

test('unique attribute has required metadata with specified primary key', () => {
  const attrMetadata = new AttributeMetadata({
    name: 'name',
    type: 'String',
    table,
    entityClass: User,
    unique: {
      partitionKey: 'USER.NAME#{{name}}',
      sortKey: 'USER.NAME#{{name}}',
    },
  });

  expect(attrMetadata).toBeTruthy();
  expect(Object.assign({}, attrMetadata)).toEqual({
    entityClass: User,
    table,
    name: 'name',
    type: 'String',
    unique: {
      attributes: {
        PK: 'USER.NAME#{{name}}',
        SK: 'USER.NAME#{{name}}',
      },
      metadata: {
        _interpolations: {
          PK: ['name'],
          SK: ['name'],
        },
      },
    },
  });
});

test('fails when given primary key schema for unique references unknown variable', () => {
  const attrMetadata = () =>
    new AttributeMetadata({
      name: 'name',
      type: 'String',
      table,
      entityClass: User,
      unique: {
        partitionKey: 'USER.NAME#{{email}}',
        sortKey: 'USER.NAME#{{email}}',
      },
    });

  expect(attrMetadata).toThrow(
    'key "USER.NAME#{{email}}" references variable "email" but it could not be resolved'
  );
});

test('default value of scalar type is properly assigned', () => {
  const attrMetadata = new AttributeMetadata({
    name: 'name',
    entityClass: User,
    table,
    type: 'String',
    default: 'some default value',
  });

  expect(Object.assign({}, attrMetadata)).toEqual({
    entityClass: User,
    table,
    type: 'String',
    name: 'name',
    default: 'some default value',
  });
});

test('default value of scalar factory type is properly assigned', () => {
  const attrMetadata = new AttributeMetadata({
    name: 'id',
    entityClass: User,
    table,
    type: 'Number',
    default: () => 2,
  });

  expect(Object.assign({}, attrMetadata)).toEqual({
    entityClass: User,
    table,
    type: 'Number',
    name: 'id',
    default: 2,
  });
});

test('fails when type of default value is not supported one', () => {
  const attrMetadata = () =>
    new AttributeMetadata({
      name: 'id',
      entityClass: User,
      table,
      type: 'Number',
      default: {
        id: '2',
      } as any,
    });

  expect(attrMetadata).toThrow(
    typeof AttributeMetadataUnsupportedDefaultValueError
  );
});
