import {AttributeMetadata} from '../attribute-metadata';

test('creates attribute metadata', () => {
  const attMetadata = new AttributeMetadata({
    name: 'id',
    type: 'String',
  });

  expect(attMetadata).toBeTruthy();
});
