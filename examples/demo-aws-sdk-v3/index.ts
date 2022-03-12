import {DocumentClientV3} from '@typedorm/document-client';
import {createConnection, getEntityManager} from '@typedorm/core';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {myGlobalTable, Organisation} from '@typedorm-example/shared-base';

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
