import {dropProp} from '../drop-prop';

test('drops given prop from object', () => {
  const obj = {
    a: '1',
    b: '2',
    c: '3',
  };

  const updated = dropProp(obj, 'a');
  expect(updated).toEqual({
    b: '2',
    c: '3',
  });
});

test('does drops any prop from object if no matches', () => {
  const obj = {
    a: '1',
    b: '2',
    c: '3',
  };

  const updated = dropProp(obj, 'd' as any);
  expect(updated).toEqual({
    a: '1',
    b: '2',
    c: '3',
  });
});
