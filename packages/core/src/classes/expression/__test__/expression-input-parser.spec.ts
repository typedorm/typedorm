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

  // expected
  // age = 12
});

test('parses filter with range operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    name: {
      CONTAINS: 'tes',
    },
  });

  // expected
  // contains(name, 'tes')
});

test('parses filter with key only operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: 'ATTRIBUTE_EXISTS',
  });

  // expected
  // attribute_exists(status)
});

test('parses filter with attribute type operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: {
      ATTRIBUTE_TYPE: ATTRIBUTE_TYPE.BOOLEAN,
    },
  });

  // expected
  // attribute_type(status, BOOL)
});

test('parses filter with size operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: {
      SIZE: {
        EQ: 1,
      },
    },
  });

  // expected
  // size(status) = 1
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

  // expected
  // (age BETWEEN 1 AND 3) AND contains(name, 'tss')
});

test('parses filter with `NOT` logical operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    NOT: {
      age: {
        BEGINS_WITH: '1',
      },
    },
  });

  // expected
  // NOT (begins_with(age, '1'))
});

test('parses filter with complex nested logical operators', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    OR: {
      AND: {
        age: {
          BETWEEN: [1, 4],
        },
        name: {
          CONTAINS: '1',
        },
        NOT: {
          status: {
            ATTRIBUTE_TYPE: ATTRIBUTE_TYPE.BOOLEAN,
          },
        },
      },
      name: {
        EQ: 'admin',
      },
    },
  });

  // expected
  // ((age BETWEEN 1 AND 4) AND (contains(name, '1')) AND (NOT (attribute_type(status, BOOL)))) OR (name = 'admin')
});
