import {ConnectionOptions} from './classes/connection/connection-options';
import {Container} from './classes/container';
import {ConnectionManager} from './classes/connection/connection-manager';

// classes
export * from './classes/condition/condition';
export * from './classes/condition/key-condition';
export * from '../common/table';
export * from './classes/connection/connection-options';
export * from './classes/transaction/write-transaction';
export * from './classes/manager/entity-manager';
export * from './classes/manager/transaction-manager';

// public method exports

export function createConnection(options: ConnectionOptions) {
  const connection = connectionManger().create(options);
  return connection.connect();
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

// private methods

function connectionManger() {
  return Container.get(ConnectionManager);
}
