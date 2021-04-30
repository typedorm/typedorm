import {ATTRIBUTE_TYPE} from '@typedorm/common';
import {User, UserPrimaryKey} from '@typedorm/core/__mocks__/user';
import {Condition} from '../condition';
import {ExpressionInputParser} from '../expression-input-parser';
import {Filter} from '../filter';
import {KeyCondition} from '../key-condition';
import {Projection} from '../projection';

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
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    age: {
      EQ: 12,
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('#FE_age = :FE_age');
});

test('parses filter with range operator', () => {
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    name: {
      CONTAINS: 'tes',
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('contains(#FE_name, :FE_name)');
});

test('parses filter with key only operator', () => {
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    status: 'ATTRIBUTE_EXISTS',
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('attribute_exists(#FE_status)');
});

test('parses filter with attribute type operator', () => {
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
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
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    status: {
      SIZE: {
        EQ: '1',
      },
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('size(#FE_status) = :FE_status');
});

test('parses filter with single logical operator', () => {
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
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
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    NOT: {
      age: {
        BEGINS_WITH: 1,
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
    User & {'profile.name.firstName': string},
    UserPrimaryKey
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
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
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

test('parses deep nested condition', () => {
  const parsedCondition = expInputParser.parseToCondition<User>({
    NOT: {
      NOT: {
        OR: {
          AND: {
            age: 'ATTRIBUTE_EXISTS',
            name: 'ATTRIBUTE_NOT_EXISTS',
          },
          status: {
            LE: '1',
          },
        },
      },
    },
  });

  expect(parsedCondition).toBeInstanceOf(Condition);
  expect(parsedCondition?.expression).toEqual(
    'NOT (NOT (((attribute_exists(#CE_age)) AND (attribute_not_exists(#CE_name))) OR (#CE_status <= :CE_status)))'
  );
  expect(parsedCondition?.names).toEqual({
    '#CE_age': 'age',
    '#CE_name': 'name',
    '#CE_status': 'status',
  });
  expect(parsedCondition?.values).toEqual({
    ':CE_status': '1',
  });
});

/**
 * @group parseToProjection
 */
test('parses options to valid projection', () => {
  const projection = expInputParser.parseToProjection<User>([
    'id',
    'name',
    'status.active',
  ]);

  expect(projection).toBeInstanceOf(Projection);
  expect(projection.expression).toEqual(
    '#PE_id, #PE_name, #PE_status.#PE_status_active'
  );
});
