import {User} from '@typedorm/core/__mocks__/user';
import {UserAutoGenerateAttributes} from '@typedorm/core/__mocks__/user-auto-generate-attributes';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {ScanManager} from '../scan-manager';

let manager: ScanManager;
let connection: Connection;
const dcMock = {
  scan: jest.fn(),
};

beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail, UserAutoGenerateAttributes],
    documentClient: dcMock,
  });

  manager = new ScanManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('scan manager works', () => {
  expect(manager).toBeTruthy();
});
