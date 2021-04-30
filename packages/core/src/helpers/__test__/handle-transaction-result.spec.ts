import {TransactionCancelledException} from '@typedorm/common';
import {Response} from 'aws-sdk';
import {handleTransactionResult} from '../handle-transaction-result';

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
  const parsedResponse = await handleTransactionResult(request);
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
    await handleTransactionResult(request);
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
