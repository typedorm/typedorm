import {createTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {TestEntity} from './test-entity';

it('validates entity and creates successful connection', async () => {
  const connection = createTestConnection({
    entities: [TestEntity],
    documentClient: {},
  });
  const entityManager = new EntityManager(connection);

  expect(connection.hasMetadata(TestEntity)).toBeTruthy();

  expect(entityManager).toBeInstanceOf(EntityManager);
});
