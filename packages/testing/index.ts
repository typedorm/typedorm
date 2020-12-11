import {Replace} from '@typedorm/common';
import {
  createConnection,
  ConnectionOptions,
  Container,
  ConnectionManager,
} from '@typedorm/core';

import {DynamoDB} from 'aws-sdk';

export function createTestConnection(
  connectionOptions: Replace<
    ConnectionOptions,
    'documentClient',
    {
      documentClient?: {
        [key in keyof DynamoDB.DocumentClient]?: jest.SpyInstance;
      };
    }
  >
) {
  return createConnection(connectionOptions as ConnectionOptions);
}

export function resetTestConnection() {
  Container.get(ConnectionManager).clear();
}
