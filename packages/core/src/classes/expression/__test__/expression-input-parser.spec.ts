import {ATTRIBUTE_TYPE} from '@typedorm/common';
import {User, UserPrimaryKey} from '@typedorm/core/__mocks__/user';
import {ExpressionInputParser} from '../expression-input-parser';
import {Filter} from '../filter';
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

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('#FE_age = :FE_age');
});

test('parses filter with range operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    name: {
      CONTAINS: 'tes',
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('contains(#FE_name, :FE_name)');
});

test('parses filter with key only operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: 'ATTRIBUTE_EXISTS',
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('attribute_exists(#FE_status)');
});

test('parses filter with attribute type operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: {
      ATTRIBUTE_TYPE: ATTRIBUTE_TYPE.BOOLEAN,
    },
  });
  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual(
    'attribute_type(#FE_status, :FE_status)'
  );
  expect(parsedFilter?.values).toEqual({':FE_status': 'BOOL'});
});

test('parses filter with size operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    status: {
      SIZE: {
        EQ: 1,
      },
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('size(#FE_status) = :FE_status');
});

test('parses filter with single logical operator', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    AND: {
      age: {
        BETWEEN: [1, 3],
      },
      name: {
        CONTAINS: 'zuki',
      },
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual(
    '(#FE_age BETWEEN :FE_age_start AND :FE_age_end) AND (contains(#FE_name, :FE_name))'
  );
  expect(parsedFilter?.names).toEqual({'#FE_age': 'age', '#FE_name': 'name'});
  expect(parsedFilter?.values).toEqual({
    ':FE_age_end': 3,
    ':FE_age_start': 1,
    ':FE_name': 'zuki',
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

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual(
    'NOT (begins_with(#FE_age, :FE_age))'
  );
});

test('parses nester object property', () => {
  const parsedFilter = expInputParser.parseToFilter<
    UserPrimaryKey,
    User & {'profile.name.firstName': string}
  >({
    'profile.name.firstName': {
      EQ: 'sam',
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual(
    '#FE_profile.#FE_profile_name.#FE_profile_name_firstName = :FE_profile_name_firstName'
  );
  expect(parsedFilter?.names).toEqual({
    '#FE_profile': 'profile',
    '#FE_profile_name': 'name',
    '#FE_profile_name_firstName': 'firstName',
  });
  expect(parsedFilter?.values).toEqual({
    ':FE_profile_name_firstName': 'sam',
  });
});

test('parses filter with complex nested logical operators', () => {
  const parsedFilter = expInputParser.parseToFilter<UserPrimaryKey, User>({
    OR: {
      AND: {
        age: {
          BETWEEN: [1, 4],
        },
        NOT: {
          status: {
            ATTRIBUTE_TYPE: ATTRIBUTE_TYPE.STRING_SET,
          },
        },
      },
      name: {
        EQ: 'admin',
      },
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual(
    '((#FE_age BETWEEN :FE_age_start AND :FE_age_end) AND (NOT (attribute_type(#FE_status, :FE_status)))) OR (#FE_name = :FE_name)'
  );
  expect(parsedFilter?.names).toEqual({
    '#FE_age': 'age',
    '#FE_name': 'name',
    '#FE_status': 'status',
  });
  expect(parsedFilter?.values).toEqual({
    ':FE_age_end': 4,
    ':FE_age_start': 1,
    ':FE_name': 'admin',
    ':FE_status': 'SS',
  });
});
