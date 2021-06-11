import {AddUpdate} from '../update/add-update';
import {SetUpdate} from '../update/set-update';

test('merges multiple update expressions with diff action', () => {
  const updateSet = new SetUpdate().to('name', 'user');
  const updateAdd = new AddUpdate();

  expect(updateSet.merge(updateAdd)).toEqual({
    _names: {
      '#UE_name': 'name',
    },
    _values: {
      ':UE_name': 'user',
    },
    expression: '#UE_name = :UE_name',
    prefix: 'SET',
  });
});
