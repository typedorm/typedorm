import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DEFAULT_TRANSLATE_CONFIG_V3} from '../../constants/translate-config';
import {DocumentClient} from '../base-document-client';
import {DocumentClientV3} from '../document-client-v3';

let dc: DocumentClient;

const awsDcMock = {
  send: jest.fn(),
  config: {} as any,
} as Partial<DynamoDBClient>;

beforeEach(() => {
  dc = new DocumentClientV3(awsDcMock as unknown as DynamoDBClient);
});

test('registers a valid documentClient instance', async () => {
  expect(dc.version).toEqual(3);
});

it('uses default documentClientV3 translate config', () => {
  const documentClientInstance = new DocumentClientV3(new DynamoDBClient({}));

  expect(documentClientInstance.documentClient.config.translateConfig).toEqual(
    DEFAULT_TRANSLATE_CONFIG_V3
  );
});

it('overrides documentClientV3 translate config with custom values', () => {
  const documentClientInstance = new DocumentClientV3(new DynamoDBClient({}), {
    marshallOptions: {
      convertEmptyValues: true,
    },
    unmarshallOptions: {
      wrapNumbers: true,
    },
  });

  expect(documentClientInstance.documentClient.config.translateConfig).toEqual({
    marshallOptions: {
      convertClassInstanceToMap: false,
      convertEmptyValues: true,
      removeUndefinedValues: false,
    },
    unmarshallOptions: {
      wrapNumbers: true,
    },
  });
});

it('correctly merges documentClientV3 translate config with custom values when all values are not provided', () => {
  const documentClientInstance = new DocumentClientV3(new DynamoDBClient({}), {
    marshallOptions: {},
    unmarshallOptions: undefined,
  });

  expect(documentClientInstance.documentClient.config.translateConfig).toEqual(
    DEFAULT_TRANSLATE_CONFIG_V3
  );
});
