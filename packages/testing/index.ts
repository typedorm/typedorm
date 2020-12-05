import {Replace} from '@typedorm/common';
import {createConnection, ConnectionOptions} from '@typedorm/core';
import {ConnectionManager} from '@typedorm/core/classes/connection/connection-manager';
import {Container} from '@typedorm/core/classes/container';
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
