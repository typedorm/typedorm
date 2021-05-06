import {getInterpolatedKeys} from '../get-interpolated-keys';

test('returns all interpolated keys', () => {
  const keys = getInterpolatedKeys('USER#{{id}}#other@5{{name}}');

  expect(keys).toEqual(['id', 'name']);
});

test('returns distinct interpolated keys when schema contains duplications', () => {
  const keys = getInterpolatedKeys('USER#{{id}}#other@5{{id}}');

  expect(keys).toEqual(['id']);
});

test('returns empty list when no interpolation was found', () => {
  const keys = getInterpolatedKeys('USER#{id}#other@5');

  expect(keys).toEqual([]);
});

test('returns empty list when attribute alias schema type is referenced', () => {
  const keys = getInterpolatedKeys({
    alias: 'name',
  });

  expect(keys).toEqual(['name']);
});
