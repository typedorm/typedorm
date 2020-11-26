import {User} from '../../../__mocks__/user';
import {EntityMetadataBuilder} from '../entity-metadata-builder';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';

let metadataBuilder: EntityMetadataBuilder;
beforeEach(() => {
  const connection = createTestConnection({
    entities: [],
  });
  metadataBuilder = new EntityMetadataBuilder(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('builds entity metadata from decorated raw metadatas', () => {
  const [metadata] = metadataBuilder.build([User]);
  expect(metadata.schema).toEqual({
    indexes: {
      GSI1: {
        GSI1PK: 'USER#STATUS#{{status}}',
        GSI1SK: 'USER#{{name}}',
        _interpolations: {
          GSI1PK: ['status'],
          GSI1SK: ['name'],
        },
        _name: 'GSI1',
        type: 'GLOBAL_SECONDARY_INDEX',
      },
    },
    primaryKey: {
      PK: 'USER#{{id}}',
      SK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
      },
    },
  });
});
