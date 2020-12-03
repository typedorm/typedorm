import {createConnection, ConnectionOptions} from '@typedorm/core';
import {ConnectionManager} from '@typedorm/core/classes/connection/connection-manager';
import {Container} from '@typedorm/core/classes/container';

export function createTestConnection(connectionOptions: ConnectionOptions) {
  return createConnection(connectionOptions);
}

export function resetTestConnection() {
  Container.get(ConnectionManager).clear();
}
