import {Condition} from '../condition';
import {ExpressionBuilder} from '../expression-builder';
import {Filter} from '../filter';
import {Projection} from '../projection';
import {AddUpdate} from '../update/add-update';
import {DeleteUpdate} from '../update/delete-update';
import {RemoveUpdate} from '../update/remove-update';
import {SetUpdate} from '../update/set-update';
import {Update} from '../update/update';

const expressionBuilder = new ExpressionBuilder();

/**
 * @group buildConditionExpression
 */
test('builds condition expression', () => {
  const conditionExpression = expressionBuilder.buildConditionExpression(
    new Condition().attributeNotExist('PK')
  );

  expect(conditionExpression).toEqual({
    ConditionExpression: 'attribute_not_exists(#CE_PK)',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
    },
  });
});

/**
 * @group buildUpdateExpression
 */
test('builds update expression', () => {
  const item = new Update().merge(new SetUpdate().setTo('name', 'new name'));
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression: 'SET #UE_name = :UE_name',
    ExpressionAttributeNames: {
      '#UE_name': 'name',
    },
    ExpressionAttributeValues: {
      ':UE_name': 'new name',
    },
  });
});

test('builds update expression for nested object', () => {
  const item = new Update().merge(
    new SetUpdate().setTo('user.name', 'new name')
  );
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression: 'SET #UE_user.#UE_user_name = :UE_user_name',
    ExpressionAttributeNames: {
      '#UE_user': 'user',
      '#UE_user_name': 'name',
    },
    ExpressionAttributeValues: {
      ':UE_user_name': 'new name',
    },
  });
});

test('builds update expression for complex nested object', () => {
  const item = new Update().merge(
    new SetUpdate()
      .setTo('application', 'test')
      .and()
      .setTo('profile.name.last', 'new Last name')
      .and()
      .setTo('data', [1, 2, 3])
      .and()
      .setTo('address[0]', 'new address portion')
      .and()
      .setTo('complex.nested.object[1]', 'new value')
  );
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression:
      'SET #UE_application = :UE_application, #UE_profile.#UE_profile_name.#UE_profile_name_last = :UE_profile_name_last, #UE_data = :UE_data, #UE_address[0] = :UE_address[0], #UE_complex.#UE_complex_nested.#UE_complex_nested_object[1] = :UE_complex_nested_object[1]',
    ExpressionAttributeNames: {
      '#UE_address[0]': 'address[0]',
      '#UE_application': 'application',
      '#UE_complex': 'complex',
      '#UE_complex_nested': 'nested',
      '#UE_complex_nested_object[1]': 'object[1]',
      '#UE_data': 'data',
      '#UE_profile': 'profile',
      '#UE_profile_name': 'name',
      '#UE_profile_name_last': 'last',
    },
    ExpressionAttributeValues: {
      ':UE_address[0]': 'new address portion',
      ':UE_application': 'test',
      ':UE_complex_nested_object[1]': 'new value',
      ':UE_data': [1, 2, 3],
      ':UE_profile_name_last': 'new Last name',
    },
  });
});

test('builds update expression for body with different actions', () => {
  const item = new Update().mergeMany([
    new SetUpdate()
      .setTo('application', 'test')
      .and()
      .setTo('profile.name.last', 'new Last name'),
    new AddUpdate().addTo('data', [1, 2, 3]),
    new RemoveUpdate().remove('address', {
      atIndexes: [0],
    }),
    new DeleteUpdate().delete('complex.nested.attr', ['new value']),
  ]);
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    ExpressionAttributeNames: {
      '#UE_address': 'address',
      '#UE_application': 'application',
      '#UE_complex': 'complex',
      '#UE_complex_nested': 'nested',
      '#UE_complex_nested_attr': 'attr',
      '#UE_data': 'data',
      '#UE_profile': 'profile',
      '#UE_profile_name': 'name',
      '#UE_profile_name_last': 'last',
    },
    ExpressionAttributeValues: {
      ':UE_application': 'test',
      ':UE_complex_nested_attr': ['new value'],
      ':UE_data': [1, 2, 3],
      ':UE_profile_name_last': 'new Last name',
    },
    UpdateExpression:
      'SET #UE_application = :UE_application, #UE_profile.#UE_profile_name.#UE_profile_name_last = :UE_profile_name_last ADD #UE_data :UE_data REMOVE #UE_address[0] DELETE #UE_complex.#UE_complex_nested.#UE_complex_nested_attr :UE_complex_nested_attr',
  });
});

/**
 * Issue 41 null values
 */
test('allows updating attribute with null value', () => {
  const item = new Update().merge(new SetUpdate().setTo('user.name', null));
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression: 'SET #UE_user.#UE_user_name = :UE_user_name',
    ExpressionAttributeNames: {
      '#UE_user': 'user',
      '#UE_user_name': 'name',
    },
    ExpressionAttributeValues: {
      ':UE_user_name': null,
    },
  });
});

/**
 * Issue 41 falsy values
 */
test('allows updating attribute with empty string', () => {
  const item = new Update().merge(new SetUpdate().setTo('user.name', ''));
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression: 'SET #UE_user.#UE_user_name = :UE_user_name',
    ExpressionAttributeNames: {
      '#UE_user': 'user',
      '#UE_user_name': 'name',
    },
    ExpressionAttributeValues: {
      ':UE_user_name': '',
    },
  });
});

/**
 * @group buildFilterExpression
 */
test('builds filter expression', () => {
  const filter = new Filter().attributeNotExists('profile.deleted');
  const filterExpression = expressionBuilder.buildFilterExpression(filter);

  expect(filterExpression).toEqual({
    ExpressionAttributeNames: {
      '#FE_profile': 'profile',
      '#FE_profile_deleted': 'deleted',
    },
    FilterExpression: 'attribute_not_exists(#FE_profile.#FE_profile_deleted)',
  });
});

/**
 * @group buildProjectionExpression
 */
test('builds projection expression', () => {
  const projection = new Projection().addProjectionAttributes([
    'name',
    'user.status',
  ]);

  const projectionExpression = expressionBuilder.buildProjectionExpression(
    projection
  );

  expect(projectionExpression).toEqual({
    ExpressionAttributeNames: {
      '#PE_name': 'name',
      '#PE_user': 'user',
      '#PE_user_status': 'status',
    },
    ProjectionExpression: '#PE_name, #PE_user.#PE_user_status',
  });
});
