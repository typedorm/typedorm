import {execSync} from 'child_process';
// Prepare
execSync('npm install --silent');

// Run
import AWS from 'aws-sdk';
import {DocumentClientV2} from '@typedorm/document-client';
import {myGlobalTable, Organisation} from '@typedorm-example/shared-base';
import {createConnection, getEntityManager} from '@typedorm/core';

// Create connection
createConnection({
  table: myGlobalTable,
  entities: [Organisation],
  documentClient: new DocumentClientV2(
    new AWS.DynamoDB.DocumentClient({
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
    })
  ),
});

// Use Entity Manager
const entityManger = getEntityManager();
const org = new Organisation();
org.name = 'My awesome org';

(async function main() {
  console.log('Using AWS SDK v2....');

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
