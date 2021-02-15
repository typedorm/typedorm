import {table} from '@typedorm/core/__mocks__/table';
import {createTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {DocumentClientBatchTransformer} from '../document-client-batch-transformer';

let connection: Connection;
let dcBatchTransformer: DocumentClientBatchTransformer;
beforeEach(() => {
  connection = createTestConnection({
    entities: [],
    table,
  });
  dcBatchTransformer = new DocumentClientBatchTransformer(connection);
});

test('correctly extends low order transformers', () => {
  expect(dcBatchTransformer.connection).toEqual(connection);
});
