import {SetUpdate} from '../update/set-update';
test('creates update expression', () => {
  const updateSet = new SetUpdate()
    .to('name', 'user')
    .and()
    .to('email', 'email@user.com');

  expect(updateSet).toEqual({
    _names: {
      '#UE_email': 'email',
      '#UE_name': 'name',
    },
    _values: {
      ':UE_email': 'email@user.com',
      ':UE_name': 'user',
    },
    expression: '#UE_name = :UE_name, #UE_email = :UE_email',
    prefix: 'SET',
  });
});

test('merges update expressions', () => {
  const updateSet = new SetUpdate().to('name', 'user');
  const updateSet2 = new SetUpdate().toIfNotExists('age', 3);

  expect(updateSet.merge(updateSet2)).toEqual({
    _names: {
      '#UE_age': 'age',
      '#UE_name': 'name',
    },
    _values: {
      ':UE_age': 3,
      ':UE_name': 'user',
    },
    expression:
      '#UE_name = :UE_name, #UE_age = if_not_exists(#UE_age, :UE_age)',
    prefix: 'SET',
  });
});

test('creates update expression with different actions', () => {
  const updateSet = new SetUpdate()
    .appendToList('name', ['user'])
    .and()
    .to('email', 'email@user.com');

  expect(updateSet).toEqual({
    _names: {
      '#UE_email': 'email',
      '#UE_name': 'name',
    },
    _values: {
      ':UE_email': 'email@user.com',
      ':UE_name': ['user'],
    },
    expression:
      '#UE_name = list_append(#UE_name, :UE_name), #UE_email = :UE_email',
    prefix: 'SET',
  });
});

test('creates update expression with optional increment strategy', () => {
  const updateSet = new SetUpdate().to('age', 2, 'INCREMENT_BY');

  expect(updateSet).toEqual({
    _names: {
      '#UE_age': 'age',
    },
    _values: {
      ':UE_age': 2,
    },
    expression: '#UE_age = #UE_age + :UE_age',
    prefix: 'SET',
  });
});

test('creates update expression that checks if other attribute exists', () => {
  const updateSet = new SetUpdate().toIfNotExists('age', 2, 'age_old');

  expect(updateSet).toEqual({
    _names: {
      '#UE_age': 'age',
      '#UE_age_old': 'age_old',
    },
    _values: {
      ':UE_age': 2,
    },
    expression: '#UE_age = if_not_exists(#UE_age_old, :UE_age)',
    prefix: 'SET',
  });
});
