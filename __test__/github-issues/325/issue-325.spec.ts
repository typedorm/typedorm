import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';
import {TestEntity} from './test-entity';

let entityManager: EntityManager;

const dcMock = {
  get: jest.fn(),
  put: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [TestEntity],
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

describe('when schema version attribute is provided', () => {
  it('applies versioning to attributes on deserialization', async () => {
    dcMock.get.mockReturnValue({
      promise: () => ({
        Item: {
          PK: 'ITEM#1',
          id: '1',
          unversionedAttribute: 'should always be here',
          attributeInVersion2And3: 'should be omitted',
          schemaVersion: 1,
        },
      }),
    });

    const item = await entityManager.findOne(TestEntity, {
      id: '1',
    });

    expect(item).toEqual(
      Object.assign(new TestEntity(), {
        id: '1',
        unversionedAttribute: 'should always be here',
        schemaVersion: 1,
      })
    );
  });

  it('applies versioning to attributes on serialization', async () => {
    dcMock.put.mockReturnValue({promise: () => ({})});
    const item = Object.assign(new TestEntity(), {
      id: '1',
      unversionedAttribute: 'should always be here',
      attributeInVersion2And3: 'should be omitted',
      attributeSinceVersion3: 'should be present',
      schemaVersion: 4,
    });

    await entityManager.create(item);

    expect(dcMock.put).toHaveBeenCalledWith({
      ConditionExpression: 'attribute_not_exists(#CE_PK)',
      ExpressionAttributeNames: {
        '#CE_PK': 'PK',
      },
      Item: {
        PK: 'ITEM#1',
        __en: 'item',
        id: '1',
        unversionedAttribute: 'should always be here',
        attributeSinceVersion3: 'should be present',
        schemaVersion: 4,
      },
      ReturnConsumedCapacity: undefined,
      TableName: 'test-table',
    });
  });
});
