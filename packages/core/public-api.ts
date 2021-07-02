import {ConnectionOptions} from './src/classes/connection/connection-options';
import {Container} from './src/classes/container';
import {ConnectionManager} from './src/classes/connection/connection-manager';

// options
export * from './src/classes/connection/connection-options';

// models
export * from './src/classes/expression/condition';
export * from './src/classes/expression/key-condition';
export * from './src/classes/transaction/write-transaction';
export * from './src/classes/transaction/read-transaction';
export * from './src/classes/batch/write-batch';
export * from './src/classes/batch/read-batch';

// managers
export * from './src/classes/manager/entity-manager';
export * from './src/classes/manager/batch-manager';
export * from './src/classes/manager/transaction-manager';

// classes
export {Connection} from './src/classes/connection/connection';

// public method exports

export function createConnection(options: ConnectionOptions) {
  const connection = connectionManger().create(options);

  const connected = connection.connect();

  if (!connected) {
    throw new Error(
      `Failed to create connection with options: ${JSON.stringify(options)}`
    );
  }

  return connected;
}

export function createConnections(optionsList: ConnectionOptions[]) {
  return optionsList.map(options => createConnection(options));
}

export function getConnection() {
  return Container.get(ConnectionManager).get();
}

export function getEntityManager(connectionName?: string) {
  return connectionManger().get(connectionName).entityManager;
}

export function getTransactionManger(connectionName?: string) {
  return connectionManger().get(connectionName).transactionManger;
}

export function getBatchManager(connectionName?: string) {
  return connectionManger().get(connectionName).batchManager;
}

export function getScanManager(connectionName?: string) {
  return connectionManger().get(connectionName).scanManager;
}

// private methods

function connectionManger() {
  return Container.get(ConnectionManager);
}
