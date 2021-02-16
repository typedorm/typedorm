import {createChunks} from '../create-chunks';

test('creates chunks of specified sizes', () => {
  const originalArray = [1, 2, 3, 4, 5, 6, 7];

  const chunkedArray = createChunks(originalArray, 4);

  expect(chunkedArray).toEqual([
    [1, 2, 3, 4],
    [5, 6, 7],
  ]);
});

test('creates chunks of same size as limit', () => {
  const originalArray = [1, 2, 3, 4, 5, 6, 7];

  const chunkedArray = createChunks(originalArray, 7);

  expect(chunkedArray).toEqual([[1, 2, 3, 4, 5, 6, 7]]);
});
