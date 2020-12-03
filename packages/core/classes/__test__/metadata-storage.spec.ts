import {MetadataStorage} from '@typedorm/common/metadata-storage';
import {Table} from '@typedorm/common';

let storage: MetadataStorage;
class User {}
const table = new Table({
  name: 'test',
  partitionKey: 'PK',
});

beforeEach(() => {
  storage = new MetadataStorage();
});

test('creates global metadata storage', () => {
  expect(storage).toBeDefined();
});

test('stores entity decorator', () => {
  storage.addRawEntity({
    name: 'user',

    primaryKey: {
      partitionKey: 'USER#1',
    },
    table,
    target: User,
  });

  expect(storage.entities).toEqual([
    {
      name: 'user',
      primaryKey: {partitionKey: 'USER#1'},
      table: {options: {name: 'test', partitionKey: 'PK'}},
      target: User,
    },
  ]);
});

test('adds attribute for entity', () => {
  storage.addRawAttribute(User, {
    name: 'id',
    type: 'String',
  });
  expect(storage.attributes).toEqual([
    [
      {
        name: 'id',
        type: 'String',
      },
    ],
  ]);
});
