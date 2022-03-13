import {AWSError, DynamoDB, Request} from 'aws-sdk';
import {TransactionCancelledException} from '../exceptions';
import {DocumentClient} from './base-document-client';
export class DocumentClientV2<
  DocumentClientType extends DynamoDB.DocumentClient = DynamoDB.DocumentClient
> extends DocumentClient {
  readonly documentClient: DocumentClientType;
  readonly version = 2;

  constructor(dynamoDBClient: DocumentClientType) {
    super();
    this.documentClient = dynamoDBClient;
  }

  async put(
    input: DynamoDB.DocumentClient.PutItemInput
  ): Promise<DynamoDB.DocumentClient.PutItemOutput> {
    return this.documentClient.put(input).promise();
  }

  async get(
    input: DynamoDB.DocumentClient.GetItemInput
  ): Promise<DynamoDB.DocumentClient.GetItemOutput> {
    return this.documentClient.get(input).promise();
  }

  async query(
    input: DynamoDB.DocumentClient.QueryInput
  ): Promise<DynamoDB.DocumentClient.QueryOutput> {
    return this.documentClient.query(input).promise();
  }

  async update(
    input: DynamoDB.DocumentClient.UpdateItemInput
  ): Promise<DynamoDB.DocumentClient.UpdateItemOutput> {
    return this.documentClient.update(input).promise();
  }

  async delete(
    input: DynamoDB.DocumentClient.DeleteItemInput
  ): Promise<DynamoDB.DocumentClient.DeleteItemOutput> {
    return this.documentClient.delete(input).promise();
  }

  async batchWrite(
    input: DynamoDB.DocumentClient.BatchWriteItemInput
  ): Promise<DynamoDB.DocumentClient.BatchWriteItemOutput> {
    return this.documentClient.batchWrite(input).promise();
  }

  async batchGet(
    input: DynamoDB.DocumentClient.BatchGetItemInput
  ): Promise<DynamoDB.DocumentClient.BatchGetItemOutput> {
    return this.documentClient.batchGet(input).promise();
  }

  async transactGet(
    input: DynamoDB.DocumentClient.TransactGetItemsInput
  ): Promise<DynamoDB.DocumentClient.TransactGetItemsOutput> {
    const transactionResult = this.transactGetRaw(input);
    return this.handleTransactionResult(transactionResult);
  }

  async transactWrite(
    input: DynamoDB.DocumentClient.TransactWriteItemsInput
  ): Promise<DynamoDB.DocumentClient.TransactWriteItemsOutput> {
    const transactionResult = this.transactWriteRaw(input);
    return this.handleTransactionResult(transactionResult);
  }

  async scan(
    input: DynamoDB.DocumentClient.ScanInput
  ): Promise<DynamoDB.DocumentClient.ScanOutput> {
    return this.documentClient.scan(input).promise();
  }

  ///
  /// Private Methods
  ///
  private transactGetRaw(
    input: DynamoDB.DocumentClient.TransactGetItemsInput
  ): Request<DynamoDB.DocumentClient.TransactGetItemsOutput, AWSError> {
    return this.documentClient.transactGet(input);
  }

  private transactWriteRaw(
    input: DynamoDB.DocumentClient.TransactWriteItemsInput
  ): Request<DynamoDB.DocumentClient.TransactWriteItemsOutput, AWSError> {
    return this.documentClient.transactWrite(input);
  }

  private handleTransactionResult<T>(transactionRequest: Request<T, AWSError>) {
    let cancellationReasons: {
      Code: string;
      Message: string;
      Item: DynamoDB.DocumentClient.AttributeMap;
    }[];
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
              item: reason.Item,
            };
          });
          return reject(new TransactionCancelledException(err.code, reasons));
        }

        return resolve(response);
      });
    }) as Promise<T>;
  }
}
