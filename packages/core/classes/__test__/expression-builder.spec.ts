import {Condition} from '../condition/condition';
import {ExpressionBuilder} from '../expression-builder';
import {MetadataManager} from '@typedorm/common/metadata-manager';

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
  const item = {
    name: 'new name',
  };
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression: 'SET #attr0 = :val0',
    ExpressionAttributeNames: {
      '#attr0': 'name',
    },
    ExpressionAttributeValues: {
      ':val0': 'new name',
    },
  });
});

test('builds update expression for nested object', () => {
  const item = {
    'user.name': 'new name',
  };
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression: 'SET #attr0_inner0.#attr0_inner1 = :val0',
    ExpressionAttributeNames: {
      '#attr0_inner0': 'user',
      '#attr0_inner1': 'name',
    },
    ExpressionAttributeValues: {
      ':val0': 'new name',
    },
  });
});

test('builds update expression for complex nested object', () => {
  const item = {
    application: 'test',
    'profile.name.last': 'new Last name',
    data: [1, 2, 3],
    'address[0]': 'new address portion',
    'complex.nested.object[1]': 'new value',
  };
  const expression = expressionBuilder.buildUpdateExpression(item);
  expect(expression).toEqual({
    UpdateExpression:
      'SET #attr0 = :val0, #attr1_inner0.#attr1_inner1.#attr1_inner2 = :val1, #attr2 = :val2, #attr3 = :val3, #attr4_inner0.#attr4_inner1.#attr4_inner2 = :val4',
    ExpressionAttributeNames: {
      '#attr0': 'application',
      '#attr1_inner0': 'profile',
      '#attr1_inner1': 'name',
      '#attr1_inner2': 'last',
      '#attr2': 'data',
      '#attr3': 'address[0]',
      '#attr4_inner0': 'complex',
      '#attr4_inner1': 'nested',
      '#attr4_inner2': 'object[1]',
    },
    ExpressionAttributeValues: {
      ':val0': 'test',
      ':val1': 'new Last name',
      ':val2': [1, 2, 3],
      ':val3': 'new address portion',
      ':val4': 'new value',
    },
  });
});
