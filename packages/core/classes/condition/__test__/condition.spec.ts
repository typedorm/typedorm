import { Condition } from '../condition';

test('create condition expression with given condition', () => {
  const condition = new Condition().attributeNotExist('PK');
  expect(condition).toEqual({
    expression: 'attribute_not_exists(#CE_PK)',
    _names: {
      '#CE_PK': 'PK',
    },
  });
});
