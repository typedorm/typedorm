import {
  BatchManager,
  EntityManager,
  getBatchManager,
  getEntityManager,
  getScanManager,
  getTransactionManger,
  TransactionManager,
} from '@typedorm/core';
import {ScanManager} from '@typedorm/core/src/classes/manager/scan-manager';
import {createTestConnection, resetTestConnection} from '.';

beforeEach(() => {
  createTestConnection({
    entities: [],
    documentClient: {},
  });
});

afterEach(() => {
  resetTestConnection();
});

test('gets entity manager', () => {
  const entityManager = getEntityManager();
  expect(entityManager).toBeInstanceOf(EntityManager);
});

test('gets transaction manager', () => {
  const transactionManager = getTransactionManger();
  expect(transactionManager).toBeInstanceOf(TransactionManager);
});

test('gets batch manager', () => {
  const batchManager = getBatchManager();
  expect(batchManager).toBeInstanceOf(BatchManager);
});

test('gets scan manager', () => {
  const scanManager = getScanManager();
  expect(scanManager).toBeInstanceOf(ScanManager);
});
