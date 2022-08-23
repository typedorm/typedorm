import {TransactionCancelledException} from './../../exceptions/transaction-cancelled-exception';
import {DynamoDB, Response} from 'aws-sdk';
import {DocumentClientV2} from '../document-client-v2';

let dc: DocumentClientV2;

const awsDcMock = {
  put: jest.fn(),
};

beforeEach(() => {
  dc = new DocumentClientV2(awsDcMock as unknown as DynamoDB.DocumentClient);
});

test('registers a valid documentClient instance', async () => {
  expect(dc.version).toEqual(2);
});

test('handles dynamodb success response', async () => {
  const request = {
    on: jest.fn(),
    send: jest.fn().mockImplementation(cb => {
      cb(null, {
        ConsumedCapacity: [{}],
        ItemCollectionMetrics: [{}],
      });
    }),
  } as any;
  const parsedResponse = await (dc as any).handleTransactionResult(request);
  expect(parsedResponse).toEqual({
    ConsumedCapacity: [{}],
    ItemCollectionMetrics: [{}],
  });
});

test('correctly aggregates cancellation reasons', async () => {
  const request = {
    on: jest.fn().mockImplementation((type, cb) => {
      const response = new Response();
      response.httpResponse.body = Buffer.from(
        JSON.stringify({
          CancellationReasons: [
            {
              Code: 'ConditionalCheckFailed',
              Message: 'Failed',
            },
            {
              Code: 'TransactionConflict',
              Message: 'Conflict',
            },
          ],
        })
      );
      cb(response);
    }),
    send: jest.fn().mockImplementation(cb => {
      cb({code: 500});
    }),
  } as any;

  try {
    await (dc as any).handleTransactionResult(request);
  } catch (err) {
    expect(err).toBeInstanceOf(TransactionCancelledException);
    expect((err as TransactionCancelledException).cancellationReasons).toEqual([
      {
        code: 'ConditionalCheckFailed',
        message: 'Failed',
      },
      {
        code: 'TransactionConflict',
        message: 'Conflict',
      },
    ]);
  }
});
