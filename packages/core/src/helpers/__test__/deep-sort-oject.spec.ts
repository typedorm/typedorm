import {deepSortObject} from '../deep-sort-object';

test('sorts simple object', () => {
  const unsorted = {
    name: 'xxx',
    age: 12,
  };

  const sorted = deepSortObject(unsorted);

  expect(JSON.stringify(unsorted)).toEqual('{"name":"xxx","age":12}');
  expect(JSON.stringify(sorted)).toEqual('{"age":12,"name":"xxx"}');
});

test('sorts nested object', () => {
  const unsorted = {
    name: 'xxx',
    age: {
      z: 34,
      id: 12,
      a: '12',
    },
  };

  const sorted = deepSortObject(unsorted);

  expect(JSON.stringify(unsorted)).toEqual(
    '{"name":"xxx","age":{"z":34,"id":12,"a":"12"}}'
  );
  expect(JSON.stringify(sorted)).toEqual(
    '{"age":{"a":"12","id":12,"z":34},"name":"xxx"}'
  );
});
