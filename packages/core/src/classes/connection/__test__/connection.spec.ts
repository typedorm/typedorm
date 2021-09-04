import {DocumentClientV2, DocumentClientV3} from '@typedorm/document-client';
import {DynamoDB} from 'aws-sdk';
import {Connection} from './../connection';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';

test('correctly instantiates documentClient when default document client is passed in for v2', () => {
  const connection = new Connection({entities: []}, () => {});

  const documentClient = connection.loadOrInitiateDocumentClient(
    new DynamoDB.DocumentClient()
  );
  expect(documentClient).toBeInstanceOf(DocumentClientV2);
});

test('correctly instantiates documentClient v2 when none is passed in', () => {
  const connection = new Connection({entities: []}, () => {});

  const documentClient = connection.loadOrInitiateDocumentClient();
  expect(documentClient).toBeInstanceOf(DocumentClientV2);
});

test('correctly instantiates documentClient v2', () => {
  const connection = new Connection({entities: []}, () => {});

  const documentClient = connection.loadOrInitiateDocumentClient(
    new DocumentClientV2(new DynamoDB.DocumentClient())
  );
  expect(documentClient).toBeInstanceOf(DocumentClientV2);
});

test('correctly instantiates documentClient v3', () => {
  const connection = new Connection({entities: []}, () => {});

  const documentClient = connection.loadOrInitiateDocumentClient(
    new DocumentClientV3(new DynamoDBClient({}))
  );
  expect(documentClient).toBeInstanceOf(DocumentClientV3);
});
