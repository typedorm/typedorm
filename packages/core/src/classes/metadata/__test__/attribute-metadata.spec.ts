import {AttributeMetadata} from '../attribute-metadata';

test('creates attribute metadata', () => {
  const attMetadata = new AttributeMetadata({
    name: 'id',
    type: 'String',
  });

  expect(attMetadata).toBeTruthy();
});

test('creates attribute metadata for with custom prefix', () => {
  const attrMetadata = new AttributeMetadata({
    name: 'id',
    type: 'String',
    unique: {
      prefix: 'USER#',
    },
  });

  expect(attrMetadata).toBeTruthy();
});
