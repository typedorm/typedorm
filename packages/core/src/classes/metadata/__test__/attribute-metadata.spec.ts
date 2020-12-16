import {User} from './../../../../__mocks__/user';
import {table} from './../../../../__mocks__/table';
import {AttributeMetadata} from '../attribute-metadata';

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
      PK: 'DRM_GEN_USER.ID#{{id}}',
      SK: 'DRM_GEN_USER.ID#{{id}}',
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
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
      PK: 'USER.NAME#{{name}}',
      SK: 'USER.NAME#{{name}}',
      _interpolations: {
        PK: ['name'],
        SK: ['name'],
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
