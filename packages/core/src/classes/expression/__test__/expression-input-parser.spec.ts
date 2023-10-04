import {ATTRIBUTE_TYPE} from '@typedorm/common';
import {User, UserPrimaryKey} from '@typedorm/core/__mocks__/user';
import {Condition} from '../condition';
import {ExpressionInputParser} from '../expression-input-parser';
import {Filter} from '../filter';
import {KeyCondition} from '../key-condition';
import {Projection} from '../projection';
import {Update} from '../update/update';

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

/**
 * Issue #139
 */
test('parses nested key filter input to valid expression', () => {
  const parsedFilter = expInputParser.parseToFilter<any, {}>({
    AND: {
      'contact.addresses[0]': {
        EQ: 12,
      },
      'bio[0].age': {
        LE: 2,
      },
    },
  });

  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter).toEqual({
    _names: {
      '#FE_contact': 'contact',
      '#FE_contact_addresses': 'addresses',
      '#FE_bio': 'bio',
      '#FE_bio_age': 'age',
    },
    _values: {
      ':FE_contact_addresses': 12,
      ':FE_bio_age': 2,
    },
    expression:
      '(#FE_contact.#FE_contact_addresses[0] = :FE_contact_addresses) AND (#FE_bio[0].#FE_bio_age <= :FE_bio_age)',
  });
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
        EQ: 1,
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

test('parses logical operator with no attributes', () => {
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    AND: {},
  });
  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter?.expression).toEqual('');
});

test('parses logical operator with single attribute', () => {
  const parsedFilter = expInputParser.parseToFilter<User, UserPrimaryKey>({
    AND: {
      age: {
        EQ: 2,
      },
      // eslint-disable-next-line no-constant-condition
      ...(true
        ? {}
        : {
            name: {
              BEGINS_WITH: 'mys',
            },
          }),
    },
  });
  expect(parsedFilter).toBeInstanceOf(Filter);
  expect(parsedFilter).toEqual({
    _names: {
      '#FE_age': 'age',
    },
    _values: {
      ':FE_age': 2,
    },
    expression: '#FE_age = :FE_age',
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

/**
 * @group parseToCondition
 */
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

test('parses logical condition expression with no attributes', () => {
  const parsedCondition = expInputParser.parseToCondition<User>({
    NOT: {},
  });
  expect(parsedCondition).toBeInstanceOf(Condition);
  expect(parsedCondition?.expression).toEqual('');
});

test('parses logical condition expression with single attribute value', () => {
  const parsedCondition = expInputParser.parseToCondition<User>({
    OR: {
      age: {
        BETWEEN: [1, 3],
      },
    },
  });
  expect(parsedCondition).toBeInstanceOf(Condition);
  expect(parsedCondition).toEqual({
    _names: {
      '#CE_age': 'age',
    },
    _values: {
      ':CE_age_end': 3,
      ':CE_age_start': 1,
    },
    expression: '#CE_age BETWEEN :CE_age_start AND :CE_age_end',
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

/**
 * @group parseToUpdate
 *
 */
test('parses update body to update expression', () => {
  const update = expInputParser.parseToUpdate<
    User,
    {'user.newAddresses': Array<string>}
  >({
    id: '2',
    name: {
      IF_NOT_EXISTS: {
        $PATH: 'id',
        $VALUE: '123',
      },
    },
    status: {
      IF_NOT_EXISTS: '1',
    },
    age: {
      INCREMENT_BY: 2,
    },
    addresses: {
      LIST_APPEND: ['1234'],
    },
    'user.newAddresses': {
      LIST_APPEND: {
        $PATH: 'addresses',
        $VALUE: ['123'],
      },
    },
  });

  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_addresses': 'addresses',
      '#UE_age': 'age',
      '#UE_id': 'id',
      '#UE_name': 'name',
      '#UE_status': 'status',
      '#UE_user': 'user',
      '#UE_user_newAddresses': 'newAddresses',
    },
    _values: {
      ':UE_addresses': ['1234'],
      ':UE_user_newAddresses': ['123'],
      ':UE_age': 2,
      ':UE_id': '2',
      ':UE_name': '123',
      ':UE_status': '1',
    },
    expression:
      'SET #UE_id = :UE_id, #UE_name = if_not_exists(#UE_id, :UE_name), #UE_status = if_not_exists(#UE_status, :UE_status), #UE_age = #UE_age + :UE_age, #UE_addresses = list_append(#UE_addresses, :UE_addresses), #UE_user.#UE_user_newAddresses = list_append(#UE_addresses, :UE_user_newAddresses)',
    prefix: '',
  });
});

test('parses update body to update expression with custom transform overrides ', () => {
  const update = expInputParser.parseToUpdate<
    User,
    {'user.newAddresses': Array<string>}
  >(
    {
      id: '2',
      name: {
        IF_NOT_EXISTS: {
          $PATH: 'id',
          $VALUE: '123',
        },
      },
    },
    {
      // when custom transformation is applied
      name: 'custom-transformed-name',
    }
  );

  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_id': 'id',
      '#UE_name': 'name',
    },
    _values: {
      ':UE_id': '2',
      ':UE_name': 'custom-transformed-name',
    },
    expression:
      'SET #UE_id = :UE_id, #UE_name = if_not_exists(#UE_id, :UE_name)',
    prefix: '',
  });
});

test('parses dynamic body to update expression with custom transform overrides', () => {
  const update = expInputParser.parseToUpdate<
    User,
    {'user.newAddresses': Array<string>}
  >(
    {
      id: '2',
      age: {
        ADD: 2,
      },
    },
    {
      // even tho we provided custom transformed value here, it should not be included
      age: 200,
    }
  );

  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_age': 'age',
      '#UE_id': 'id',
    },
    _values: {
      ':UE_age': 2,
      ':UE_id': '2',
    },
    expression: 'SET #UE_id = :UE_id ADD #UE_age :UE_age',
    prefix: '',
  });
});

test('parses explicit set update body', () => {
  const update = expInputParser.parseToUpdate<User, UserPrimaryKey>({
    id: {
      SET: '2',
    },
    name: {
      SET: {
        IF_NOT_EXISTS: {
          $PATH: 'age',
          $VALUE: '2',
        },
      },
    },
    age: {
      SET: {
        INCREMENT_BY: 2,
      },
    },
    addresses: {
      SET: {
        LIST_APPEND: ['1234'],
      },
    },
  });
  expect(update).toBeInstanceOf(Update);
  expect(update.expression).toEqual(
    'SET #UE_id = :UE_id, #UE_name = if_not_exists(#UE_age, :UE_name), #UE_age = #UE_age + :UE_age, #UE_addresses = list_append(#UE_addresses, :UE_addresses)'
  );
  expect(update).toEqual({
    _names: {
      '#UE_addresses': 'addresses',
      '#UE_age': 'age',
      '#UE_id': 'id',
      '#UE_name': 'name',
    },
    _values: {
      ':UE_addresses': ['1234'],
      ':UE_age': 2,
      ':UE_id': '2',
      ':UE_name': '2',
    },
    expression:
      'SET #UE_id = :UE_id, #UE_name = if_not_exists(#UE_age, :UE_name), #UE_age = #UE_age + :UE_age, #UE_addresses = list_append(#UE_addresses, :UE_addresses)',
    prefix: '',
  });
});

test('parses explicit "ADD" update body', () => {
  const update = expInputParser.parseToUpdate<
    User,
    {newAddresses: number[]; mySet: Set<number>}
  >({
    age: {
      ADD: 1,
    },
    addresses: {
      ADD: ['123'],
    },
    newAddresses: {
      ADD: [1234],
    },
    mySet: {
      ADD: new Set([1234]),
    },
  });
  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_addresses': 'addresses',
      '#UE_age': 'age',
      '#UE_newAddresses': 'newAddresses',
      '#UE_mySet': 'mySet',
    },
    _values: {
      ':UE_addresses': ['123'],
      ':UE_age': 1,
      ':UE_newAddresses': [1234],
      ':UE_mySet': new Set([1234]),
    },
    expression:
      'ADD #UE_age :UE_age, #UE_addresses :UE_addresses, #UE_newAddresses :UE_newAddresses, #UE_mySet :UE_mySet',
    prefix: '',
  });
});

test('parses explicit "REMOVE" update body', () => {
  const update = expInputParser.parseToUpdate<
    User,
    {newAddresses: Array<Buffer>}
  >({
    age: {
      REMOVE: true,
    },
    newAddresses: {
      REMOVE: {
        $AT_INDEX: [1, 3, 4],
      },
    },
  });

  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_age': 'age',
      '#UE_newAddresses': 'newAddresses',
    },
    _values: {},
    expression:
      'REMOVE #UE_age, #UE_newAddresses[1], #UE_newAddresses[3], #UE_newAddresses[4]',
    prefix: '',
  });
});

test('parses explicit "DELETE" update body', () => {
  const update = expInputParser.parseToUpdate<
    User,
    {newAddresses: Array<Buffer>; mySet: Set<number>}
  >({
    addresses: {
      DELETE: ['123'],
    },
    newAddresses: {
      DELETE: [Buffer.from('12')],
    },
    mySet: {
      DELETE: new Set([1234]),
    },
  });

  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_addresses': 'addresses',
      '#UE_newAddresses': 'newAddresses',
      '#UE_mySet': 'mySet',
    },
    _values: {
      ':UE_addresses': ['123'],
      ':UE_newAddresses': [Buffer.from('12')],
      ':UE_mySet': new Set([1234]),
    },
    expression:
      'DELETE #UE_addresses :UE_addresses, #UE_newAddresses :UE_newAddresses, #UE_mySet :UE_mySet',
    prefix: '',
  });
});

test('parses update body with mixed actions', () => {
  const update = expInputParser.parseToUpdate<User>({
    id: '2',
    name: {
      IF_NOT_EXISTS: {
        $PATH: 'id',
        $VALUE: '123',
      },
    },
    status: {
      SET: {
        IF_NOT_EXISTS: 'active',
      },
    },
    age: {
      ADD: 1,
    },
    addresses: {
      DELETE: ['123'],
    },
  });

  expect(update).toBeInstanceOf(Update);
  expect(update).toEqual({
    _names: {
      '#UE_addresses': 'addresses',
      '#UE_age': 'age',
      '#UE_id': 'id',
      '#UE_name': 'name',
      '#UE_status': 'status',
    },
    _values: {
      ':UE_addresses': ['123'],
      ':UE_age': 1,
      ':UE_id': '2',
      ':UE_name': '123',
      ':UE_status': 'active',
    },
    expression:
      'SET #UE_id = :UE_id, #UE_name = if_not_exists(#UE_id, :UE_name), #UE_status = if_not_exists(#UE_status, :UE_status) ADD #UE_age :UE_age DELETE #UE_addresses :UE_addresses',
    prefix: '',
  });
});

/**
 * @group parseToUpdateValue
 */
test('correctly parses ADD and returns update values', () => {
  const value = expInputParser.parseAttributeToUpdateValue('age', {
    ADD: 1,
  });
  expect(value).toEqual({type: 'dynamic', value: 1});
});

test('skips parsing and returns update values', () => {
  const value = expInputParser.parseAttributeToUpdateValue('name', {
    firstName: 'test',
  });
  expect(value).toEqual({
    type: 'static',
    value: {
      firstName: 'test',
    },
  });
});
test('parses SET action with static value', () => {
  const value = expInputParser.parseAttributeToUpdateValue('name', {
    IF_NOT_EXISTS: 'new name',
  });
  expect(value).toEqual({
    type: 'static',
    value: 'new name',
  });
});
test('parses SET action as dynamic value', () => {
  const value = expInputParser.parseAttributeToUpdateValue('age', {
    INCREMENT_BY: 2,
  });
  expect(value).toEqual({
    type: 'dynamic',
    value: 2,
  });
});
test('parses SET action as dynamic value for nested list actions', () => {
  const value = expInputParser.parseAttributeToUpdateValue(
    'addresses[1]',
    'new address'
  );
  expect(value).toEqual({
    type: 'dynamic',
    value: 'new address',
  });
});
