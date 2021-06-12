import {UserUniqueEmail} from '../../../../__mocks__/user-unique-email';
import {Organisation} from '../../../../__mocks__/organisation';
import {User} from '../../../../__mocks__/user';
import path from 'path';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {ConnectionMetadataBuilder} from '../connection-metadata-builder';

let metadataBuilder: ConnectionMetadataBuilder;
beforeEach(() => {
  const connection = createTestConnection({
    entities: [],
  });
  metadataBuilder = new ConnectionMetadataBuilder(connection);
});

afterEach(() => {
  resetTestConnection();
});

/**
 * @group buildEntityMetadatas
 */
test('builds entity metadata from list of entities', () => {
  const entities = metadataBuilder.buildEntityMetadatas([
    User,
    Organisation,
    UserUniqueEmail,
  ]);

  expect(entities.length).toEqual(3);
});

test('builds entity metadata with path match', () => {
  const entities = metadataBuilder.buildEntityMetadatas(
    path.resolve(__dirname, '../../../../__mocks__/**/*.ts')
  );

  expect(entities.length).toEqual(8);
});
