import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {Tenant} from './tenant-entity';

let entityManager: EntityManager;

const dcMock = {
  update: jest.fn(),
  put: jest.fn(),
  query: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [Tenant],
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('creates tenant and preserves attribute types for primary key attributes', async () => {
  dcMock.put.mockReturnValue({promise: () => ({})});

  const ten = new Tenant();
  ten.id = 1;
  ten.active = true;
  ten.tenant = 1234;

  const updateResponse = await entityManager.create(ten);

  expect(dcMock.put).toHaveBeenCalledWith({
    ConditionExpression:
      '(attribute_not_exists(#CE_PK)) AND (attribute_not_exists(#CE_SK))',
    ExpressionAttributeNames: {
      '#CE_PK': 'PK',
      '#CE_SK': 'SK',
    },
    Item: {
      PK: 1,
      SK: true,
      __en: 'tenant',
      active: true,
      id: 1,
      tenant: 1234,
    },
    ReturnConsumedCapacity: undefined,
    TableName: 'test-table',
  });
  expect(updateResponse).toBeDefined();
});

test('allows updating attributes', async () => {
  dcMock.update.mockReturnValue({promise: () => ({})});

  const updateResponse = await entityManager.update(
    Tenant,
    {
      id: 1,
      active: true,
    },
    {
      tenant: 4444,
    }
  );

  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#UE_tenant': 'tenant',
    },
    ExpressionAttributeValues: {
      ':UE_tenant': 4444,
    },
    Key: {
      PK: 1,
      SK: true,
    },
    ReturnConsumedCapacity: undefined,
    ReturnValues: 'ALL_NEW',
    TableName: 'test-table',
    UpdateExpression: 'SET #UE_tenant = :UE_tenant',
  });
  expect(updateResponse).toBeDefined();
});
