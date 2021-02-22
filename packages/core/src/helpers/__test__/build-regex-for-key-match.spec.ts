import {buildRegexForKeyMatch} from '../build-regex-for-key-match';

test('builds regex for given key schema', () => {
  const result = buildRegexForKeyMatch('USER#{{id}}@NAME#{{name}}', [
    'name',
    'id',
  ]);

  expect(result).toEqual({
    exp: /^USER#(.*)@NAME#(.*)/gm,
    keys: ['id', 'name'],
  });
});

test('only builds regex for matching interpolated words', () => {
  const result = buildRegexForKeyMatch('USER#{{id}}@NAME#{{name}}', ['name']);

  expect(result).toEqual({
    exp: /^USER#{{id}}@NAME#(.*)/gm,
    keys: ['name'],
  });
});
