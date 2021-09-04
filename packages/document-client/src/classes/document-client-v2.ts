import {AWSError, DynamoDB, Request} from 'aws-sdk';
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
    return this.documentClient.transactGet(input).promise();
  }

  transactGetRaw(
    input: DynamoDB.DocumentClient.TransactGetItemsInput
  ): Request<DynamoDB.DocumentClient.TransactGetItemsOutput, AWSError> {
    return this.documentClient.transactGet(input);
  }

  async transactWrite(
    input: DynamoDB.DocumentClient.TransactWriteItemsInput
  ): Promise<DynamoDB.DocumentClient.TransactWriteItemsOutput> {
    return this.documentClient.transactWrite(input).promise();
  }

  transactWriteRaw(
    input: DynamoDB.DocumentClient.TransactWriteItemsInput
  ): Request<DynamoDB.DocumentClient.TransactWriteItemsOutput, AWSError> {
    return this.documentClient.transactWrite(input);
  }

  async scan(
    input: DynamoDB.DocumentClient.ScanInput
  ): Promise<DynamoDB.DocumentClient.ScanOutput> {
    return this.documentClient.scan(input).promise();
  }
}
