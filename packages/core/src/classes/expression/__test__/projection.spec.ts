import {Projection} from '../projection';

/**
 * @group addProjectionAttributes
 */
test('create projection expression with given attributes', () => {
  const projection = new Projection().addProjectionAttributes([
    'name',
    'user.age',
    'account.user.name',
  ]);
  expect(projection).toEqual({
    _names: {
      '#PE_account': 'account',
      '#PE_account_user': 'user',
      '#PE_account_user_name': 'name',
      '#PE_name': 'name',
      '#PE_user': 'user',
      '#PE_user_age': 'age',
    },
    expression:
      '#PE_name, #PE_user.#PE_user_age, #PE_account.#PE_account_user.#PE_account_user_name',
  });
});

test('create projection expression with given duplicated attributes', () => {
  const projection = new Projection().addProjectionAttributes([
    'name',
    'user.age',
    'name',
  ]);
  expect(projection).toEqual({
    _names: {
      '#PE_name': 'name',
      '#PE_user': 'user',
      '#PE_user_age': 'age',
    },
    expression: '#PE_name, #PE_user.#PE_user_age',
  });
});
