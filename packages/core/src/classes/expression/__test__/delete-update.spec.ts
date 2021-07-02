import {DeleteUpdate} from '../update/delete-update';

test('creates a update expression for deleting attributes from list', () => {
  const update = new DeleteUpdate().delete('items', ['book 1']);
  expect(update).toEqual({
    _names: {
      '#UE_items': 'items',
    },
    _values: {
      ':UE_items': ['book 1'],
    },
    expression: '#UE_items :UE_items',
    prefix: 'DELETE',
  });
});
