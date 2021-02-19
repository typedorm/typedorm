import {unParseKey} from '../unparse-key';

test('un parses simple parsed key', () => {
  const attributes = unParseKey('USER#{{id}}', 'USER#1123', ['id']);
  expect(attributes).toEqual({
    id: '1123',
  });
});

test('un parses parsed key with missing values', () => {
  const attributes = unParseKey(
    'USER#{{id}}#NAME#{{name}}',
    'USER#1123#NAME#',
    ['id', 'name']
  );

  expect(attributes).toEqual({
    id: '1123',
    name: '',
  });
});

test('un parses unstructured parsed key', () => {
  const attributes = unParseKey(
    'USER#{{id}}name@{{name}}',
    'USER#1123name@test user',
    ['id', 'name']
  );

  expect(attributes).toEqual({
    id: '1123',
    name: 'test user',
  });
});

test('skips un parsing when trying to compare unrelated strings', () => {
  const attributes = unParseKey('USER#{{id}}#name@{{name}}', 'ORG#1123', [
    'id',
    'name',
  ]);

  expect(attributes).toEqual({});
});

test('skips un parsing when trying to compare closely unrelated strings', () => {
  const attributes = unParseKey(
    'USER#{{id}}#name@{{name}}',
    'OTHER_USER#{{id}}#name@{{name}}',
    ['id', 'name']
  );

  expect(attributes).toEqual({});
});
