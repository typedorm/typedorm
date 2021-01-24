import {isUsedForPrimaryKey} from '../is-used-for-primary-key';

test('checks if given attribute is referenced in raw primary key', () => {
  const isNotUsed = isUsedForPrimaryKey(
    {
      partitionKey: 'USER#{{id}}#NAME#{{name}}:something',
    },
    'role'
  );
  expect(isNotUsed).toBeFalsy();

  const isUsed = isUsedForPrimaryKey(
    {
      partitionKey: 'USER#{{id}}#NAME#{{name}}:something',
    },
    'name'
  );
  expect(isUsed).toBeTruthy();
});

test('checks if given attribute is referenced in formatted primary key', () => {
  const isNotUsed = isUsedForPrimaryKey(
    {
      attributes: {
        PK: 'USER#{{id}}#NAME#{{name}}:something',
      },
      metadata: {
        _interpolations: {
          PK: ['id', 'name'],
        },
      },
    },
    'role'
  );
  expect(isNotUsed).toBeFalsy();

  const isUsed = isUsedForPrimaryKey(
    {
      attributes: {
        PK: 'USER#{{id}}#NAME#{{name}}:something',
        SK: 'USER#{{id}}#ROLE#{{role}}',
      },
      metadata: {
        _interpolations: {
          PK: ['id', 'name'],
          SK: ['id', 'role'],
        },
      },
    },
    'role'
  );
  expect(isUsed).toBeTruthy();
});
