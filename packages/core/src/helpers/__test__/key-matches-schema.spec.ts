import {keyMatchesSchema} from '../key-matches-schema';

test('verifies if given key matches schema', () => {
  const match = keyMatchesSchema('USER#{{id}}', 'USER#123', ['id']);

  expect(match).toEqual(true);
});

test('verifies if given key matches schema 2', () => {
  const match = keyMatchesSchema('USER#{{id}}', 'USER#123#Name@1', ['id']);

  expect(match).toEqual(true);
});

test('does not matches incorrect key', () => {
  const match = keyMatchesSchema('USER#{{id}}@Name#{{name}}', 'USER#12', [
    'id',
    'name',
  ]);

  expect(match).toEqual(false);
});
