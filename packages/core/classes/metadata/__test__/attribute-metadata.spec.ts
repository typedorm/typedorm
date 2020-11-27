import {Connection} from '../../connection/connection';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {AttributeMetadata} from '../attribute-metadata';

let connection: Connection;
beforeEach(() => {
  connection = createTestConnection({
    entities: [],
  });
});

afterEach(() => {
  resetTestConnection();
});

test('creates attribute metadata', () => {
  const attMetadata = new AttributeMetadata({
    connection,
    name: 'id',
    type: 'String',
  });

  expect(attMetadata).toBeTruthy();
});
