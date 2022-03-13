import {DocumentClientV3} from '@typedorm/document-client';
import {createConnection, getEntityManager} from '@typedorm/core';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {myGlobalTable, Organisation} from '@typedorm-example/shared-base';

// Create connection
createConnection({
  table: myGlobalTable,
  entities: [Organisation],
  documentClient: new DocumentClientV3(
    new DynamoDBClient({
      endpoint: 'http://localhost:8000',
    })
  ),
});

// Use Entity Manager
const entityManger = getEntityManager();
const org = new Organisation();
org.name = 'My awesome org';

(async function main() {
  console.log('Using AWS SDK v3....');

  console.log('Creating Organisation...');
  const orgCreated = await entityManger.create(org);
  console.log(`Created ${orgCreated.id}: `, JSON.stringify(orgCreated));

  console.log('============================');

  console.log('Fetching Organisation...');
  const orgFetched = (await entityManger.findOne(Organisation, {
    id: orgCreated.id,
  }))!;
  console.log(`Fetched ${orgFetched.id}: `, JSON.stringify(orgFetched));

  console.log('============================');

  console.log('Updating Organisation...');
  const orgUpdated = (await entityManger.update(
    Organisation,
    {
      id: orgCreated.id,
    },
    {
      name: 'Updated org name',
    }
  ))!;
  console.log(`Updated ${orgUpdated.id}: `, JSON.stringify(orgUpdated));

  console.log('============================');

  console.log('Deleting Organisation...');
  const orgDeleted = (await entityManger.delete(Organisation, {
    id: orgCreated.id,
  }))!;
  console.log(`Deleted ${orgCreated.id}: `, JSON.stringify(orgDeleted));
})();
