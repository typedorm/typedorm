import {Article, IArticlePrimaryKey} from './specific-event-entity';
import 'reflect-metadata';

import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {EntityManager} from '@typedorm/core';

jest.useFakeTimers().setSystemTime(new Date('2020-10-10'));

let entityManager: EntityManager;

const dcMock = {
  update: jest.fn(),
};
beforeEach(() => {
  const connection = createTestConnection({
    entities: [Article],
    documentClient: dcMock,
  });
  entityManager = new EntityManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('allows updating article with primary key', async () => {
  dcMock.update.mockReturnValue({
    promise: () => ({}),
  });

  await entityManager.update<Article, IArticlePrimaryKey>(
    Article,
    {
      KSUID: '12341',
    },
    {
      ContainerId: 'container-1',
    }
  );

  // batch write is called with correctly transformed dynamo entity
  expect(dcMock.update).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#UE_ContainerId': 'ContainerId',
      '#UE_GSI1PK': 'GSI1PK',
      '#UE_GSI3PK': 'GSI3PK',
      '#UE_LSI1SK': 'LSI1SK',
      '#UE_UpdatedAt': 'UpdatedAt',
    },
    ExpressionAttributeValues: {
      ':UE_ContainerId': 'container-1',
      ':UE_GSI1PK': 'CONTAINER#CONTAINER_KSUID#container-1',
      ':UE_GSI3PK': 'CONTAINER#container-1#ARTICLE#12341',
      ':UE_LSI1SK': 'ARTICLE#UPDATED_AT#2020-10-10T00:00:00.000Z',
      ':UE_UpdatedAt': '2020-10-10T00:00:00.000Z',
    },
    Key: {
      PK: 'ARTICLE#ARTICLE_KSUID#12341',
      SK: 'METADATA#ARTICLE#12341',
    },
    ReturnValues: 'ALL_NEW',
    TableName: 'article',
    UpdateExpression:
      'SET #UE_ContainerId = :UE_ContainerId, #UE_UpdatedAt = :UE_UpdatedAt, #UE_GSI1PK = :UE_GSI1PK, #UE_GSI3PK = :UE_GSI3PK, #UE_LSI1SK = :UE_LSI1SK',
  });
});
