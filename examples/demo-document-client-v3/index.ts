import 'reflect-metadata';
import {DocumentClientV3} from '@typedorm/document-client';

import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
  Table,
} from '@typedorm/common';
import {createConnection, getEntityManager} from '@typedorm/core';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';

// Create table

const myGlobalTable = new Table({
  name: 'test-table',
  partitionKey: 'PK',
  sortKey: 'SK',
});

// Create entity
@Entity({
  name: 'organisation',
  primaryKey: {
    partitionKey: 'ORG#{{id}}',
    sortKey: 'ORG#{{id}}',
  },
})
export class Organisation {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: string;

  @Attribute()
  name: string;
}

// Create connection
createConnection({
  table: myGlobalTable,
  entities: [Organisation],
  documentClient: new DocumentClientV3(new DynamoDBClient({})),
});

// Use Entity Manager
const entityManger = getEntityManager();
const org = new Organisation();
org.name = 'My awesome org';

const response = (async () => await entityManger.create(org))();
console.log(response);
