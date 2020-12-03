import {DYNAMO_QUERY_ITEMS_IMPLICIT_LIMIT} from '@typedorm/common';

export function getDynamoQueryItemsLimit() {
  try {
    return JSON.parse(
      process.env.DYNAMO_QUERY_ITEMS_IMPLICIT_LIMIT ?? ''
    ) as number;
  } catch {
    // if something went wrong while getting limit from env
    return DYNAMO_QUERY_ITEMS_IMPLICIT_LIMIT;
  }
}
