import {AddUpdate} from '../update/add-update';
import {SetUpdate} from '../update/set-update';

test('merges multiple update expressions with diff action', () => {
  const updateSet = new SetUpdate().setTo('name', 'user');
  const updateAdd = new AddUpdate().addTo('age', 3);

  expect(updateSet.merge(updateAdd)).toEqual({
    _names: {
      '#UE_name': 'name',
      '#UE_age': 'age',
    },
    _values: {
      ':UE_name': 'user',
      ':UE_age': 3,
    },
    expression: '#UE_name = :UE_name ADD #UE_age :UE_age',
    prefix: 'SET',
  });
});
