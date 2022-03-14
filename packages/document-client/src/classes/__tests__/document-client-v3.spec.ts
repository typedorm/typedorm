import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DocumentClient} from '../base-document-client';
import {DocumentClientV3} from '../document-client-v3';

let dc: DocumentClient;

const awsDcMock = {
  send: jest.fn(),
  config: {} as any,
} as Partial<DynamoDBClient>;

beforeEach(() => {
  dc = new DocumentClientV3((awsDcMock as unknown) as DynamoDBClient);
});

test('registers a valid documentClient instance', async () => {
  expect(dc.version).toEqual(3);
});
