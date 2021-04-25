import {WriteTransactionCancelledException} from '@typedorm/common';
import {AWSError, DynamoDB, Request} from 'aws-sdk';

// Current promise implementation of document client transact write does not provide a way
// the transaction was failed, as a work around we do following.
// refer to this issue for more details https://github.com/aws/aws-sdk-js/issues/2464
export function handleTransactionRequest<T>(
  transactionRequest: Request<T, AWSError>
) {
  let cancellationReasons: {Code: string; Message: string}[];
  transactionRequest.on('extractError', response => {
    try {
      cancellationReasons = JSON.parse(response.httpResponse.body.toString())
        .CancellationReasons;
    } catch (err) {
      // suppress this just in case some types of errors aren't JSON parsable
      console.error('Error extracting cancellation error', err);
    }
  });

  return new Promise((resolve, reject) => {
    transactionRequest.send((err, response) => {
      if (err) {
        // pull all reasons from response and map them to errors
        const reasons = cancellationReasons.map(reason => {
          return {
            code: reason.Code,
            message: reason.Message,
          };
        });
        return reject(
          new WriteTransactionCancelledException(err.code, reasons)
        );
      }

      return resolve(response);
    });
  }) as Promise<DynamoDB.DocumentClient.TransactWriteItemsOutput>;
}
