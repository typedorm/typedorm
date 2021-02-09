import {ATTRIBUTE_TYPE} from '@typedorm/common';
import {User, UserPrimaryKey} from '@typedorm/core/__mocks__/user';
import {ExpressionInputParser} from '../expression-input-parser';
import {KeyCondition} from '../key-condition';

let expInputParser: ExpressionInputParser;
beforeEach(() => {
  expInputParser = new ExpressionInputParser();
});

/**
 * @group parseToKeyCondition
 */
test('parses keyCondition input', () => {
  const parsedCondition = expInputParser.parseToKeyCondition('SK', {
    BEGINS_WITH: 'USER#',
  });

  expect(parsedCondition).toBeInstanceOf(KeyCondition);
  expect(parsedCondition.expression).toEqual(
    'begins_with(#KY_CE_SK, :KY_CE_SK)'
  );
});

/**
 * @group parseToFilter
 */
test('parses simple filter input', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    age: {
      EQ: 12,
    },
  });
});

test('parses filter with range operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    name: {
      CONTAINS: 'tes',
    },
  });
});

test('parses filter with key only operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: 'ATTRIBUTE_EXISTS',
  });
});

test('parses filter with attribute type operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: {
      ATTRIBUTE_TYPE: ATTRIBUTE_TYPE.BOOLEAN,
    },
  });
});

test('parses filter with size operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: {
      SIZE: {
        EQ: 1,
      },
    },
  });
});

test('parses filter with single logical operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    AND: {
      age: {
        BETWEEN: [1, 3],
      },
      name: {
        CONTAINS: 'tss',
      },
    },
  });
});

test('parses filter with `NOT` logical operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    NOT: {
      age: {
        BEGINS_WITH: '1',
      },
    },
  });
});
