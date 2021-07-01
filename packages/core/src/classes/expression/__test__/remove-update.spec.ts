import {RemoveUpdate} from '../update/remove-update';

test('creates a update expression for removing attributes from item', () => {
  const update = new RemoveUpdate().remove('age').and().remove('items[2]');
  expect(update).toEqual({
    _names: {
      '#UE_age': 'age',
      '#UE_items[2]': 'items[2]',
    },
    expression: '#UE_age, #UE_items[2]',
    prefix: 'REMOVE',
  });
});
