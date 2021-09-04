import {DynamoDB} from 'aws-sdk';
import {DocumentClientV2} from '../document-client-v2';
import {DocumentClient} from '../base-document-client';

let dc: DocumentClient;

const awsDcMock = {
  put: jest.fn(),
};

beforeEach(() => {
  dc = new DocumentClientV2((awsDcMock as unknown) as DynamoDB.DocumentClient);
});

test('registers a valid documentClient instance', async () => {
  expect(dc.version).toEqual(2);
});
