import { Container } from '../container';
import { ConnectionManager } from '../connection/connection-manager';

test('returns default connection', () => {
  const connectionInstance = Container.get(ConnectionManager);
  expect(connectionInstance instanceof ConnectionManager).toBeTruthy();
});
