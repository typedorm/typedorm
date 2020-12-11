import {UserAutoGenerateAttributes} from '../../../../__mocks__/user-auto-generate-attributes';
import {User} from '../../../../__mocks__/user';
import {AttributesMetadataBuilder} from '../attribute-metadata-builder';

jest.useFakeTimers('modern').setSystemTime(new Date('2020-10-10'));

let attributesMetadataBuilder: AttributesMetadataBuilder;
beforeEach(() => {
  attributesMetadataBuilder = new AttributesMetadataBuilder();
});

test('builds simple attribute metadata', () => {
  const metadata = attributesMetadataBuilder
    .build(User)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      unique: false,
    },
    {
      name: 'name',
      type: 'String',
      unique: false,
    },
    {
      name: 'status',
      type: 'String',
      unique: false,
    },
    {
      name: 'age',
      type: 'Number',
      unique: false,
    },
  ]);
});

test('builds multi type attribute metadata', () => {
  const metadata = attributesMetadataBuilder
    .build(UserAutoGenerateAttributes)
    .map(obj => Object.assign({}, obj));

  expect(metadata).toEqual([
    {
      name: 'id',
      type: 'String',
      unique: false,
    },
    {
      autoUpdate: true,
      name: 'updatedAt',
      strategy: 'EPOCH_DATE',
      type: 'String',
      unique: false,
      value: 1602288000,
    },
  ]);
});
