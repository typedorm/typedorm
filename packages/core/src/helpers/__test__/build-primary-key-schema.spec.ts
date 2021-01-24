import {table} from './../../../__mocks__/table';
import {buildPrimaryKeySchema} from '../build-primary-key-schema';
import {Table} from '@typedorm/common';

test('builds primary key schema for composite table', () => {
  const table = new Table({
    name: 'simple-table',
    partitionKey: 'PK',
  });
  const schema = buildPrimaryKeySchema({
    table,
    primaryKey: {
      partitionKey: 'DEMO#{{id}}',
    },
    attributes: {
      id: 'String',
      name: 'String',
    },
  });

  expect(schema).toEqual({
    attributes: {
      PK: 'DEMO#{{id}}',
    },
    metadata: {
      _interpolations: {
        PK: ['id'],
      },
    },
  });
});

test('fails when trying to build composite key schema for table with simple primary key ', () => {
  const table = new Table({
    name: 'simple-table',
    partitionKey: 'SIMPLE#{{name}}',
  });
  const schema = () =>
    buildPrimaryKeySchema({
      table,
      primaryKey: {
        partitionKey: 'DEMO#{{id}}',
        sortKey: 'DEMO#{{id}}',
      },
      attributes: {
        id: 'String',
        name: 'String',
      },
    });

  expect(schema).toThrow(
    'Table "simple-table" does not use composite key, thus sort key "DEMO#{{id}}" should not exist.'
  );
});

test('builds primary key schema for composite table', () => {
  const schema = buildPrimaryKeySchema({
    table,
    primaryKey: {
      partitionKey: 'DEMO#{{id}}',
      sortKey: 'DEMO#{{id}}',
    },
    attributes: {
      id: 'String',
      name: 'String',
    },
  });

  expect(schema).toEqual({
    attributes: {
      PK: 'DEMO#{{id}}',
      SK: 'DEMO#{{id}}',
    },
    metadata: {
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
      },
    },
  });
});

test('fails to builds simple key schema for table with composite key', () => {
  const schema = () =>
    buildPrimaryKeySchema({
      table,
      primaryKey: {
        partitionKey: 'DEMO#{{id}}',
      },
      attributes: {
        id: 'String',
        name: 'String',
      },
    });

  expect(schema).toThrow(
    'Table "test-table" uses composite key as a primary key, thus sort key is required'
  );
});
