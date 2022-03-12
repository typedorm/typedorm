import AWS from 'aws-sdk';
import {DocumentClientV2} from '@typedorm/document-client';
import {myGlobalTable, Organisation} from '@typedorm-example/shared-base';
import {createConnection, getEntityManager} from '@typedorm/core';

// Create connection
createConnection({
  table: myGlobalTable,
  entities: [Organisation],
  documentClient: new DocumentClientV2(new AWS.DynamoDB.DocumentClient()),
});

// Use Entity Manager
const entityManger = getEntityManager();
const org = new Organisation();
org.name = 'My awesome org';

const response = (async () => await entityManger.create(org))();
console.log(response);
