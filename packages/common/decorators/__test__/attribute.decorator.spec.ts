import {MetadataManager} from '../../metadata-manager';
import {Attribute} from '../attribute.decorator';
import {Entity} from '../entity.decorator';

beforeEach(() => {
  MetadataManager.createMetadataStorage();
});

afterEach(() => {
  MetadataManager.resetMetadata();
});

test('adds raw metadata', () => {
  @Entity({
    name: 'user',
    primaryKey: {
      partitionKey: 'PK',
    },
  })
  class User {
    @Attribute()
    readonly role: string;
  }
  expect(
    MetadataManager.metadataStorage.getRawAttributesForEntity(User)
  ).toEqual([
    {
      name: 'role',
      type: 'String',
    },
  ]);
});
