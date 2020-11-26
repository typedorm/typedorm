import {MetadataManager} from '../../metadata-manager';
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
      partitionKey: 'USER#{{id}}',
    },
  })
  class User {}

  const userRawMetadata = MetadataManager.metadataStorage.getRawEntityByTarget(
    User
  );

  expect(userRawMetadata).toEqual({
    name: 'user',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
    },
    target: User,
  });
});
