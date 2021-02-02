import {getDynamoQueryItemsLimit} from '../get-dynamo-query-items-limit';

test('returns default dynamo query items limit', () => {
  const limit = getDynamoQueryItemsLimit();
  expect(limit).toEqual(3000);
});

test('returns configured dynamo query items limit', () => {
  process.env.DYNAMO_QUERY_ITEMS_IMPLICIT_LIMIT = '200';

  const limit = getDynamoQueryItemsLimit();
  expect(limit).toEqual(200);

  delete process.env.DYNAMO_QUERY_ITEMS_IMPLICIT_LIMIT;
});
