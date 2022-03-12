import {
  BatchGetItemInput,
  BatchGetItemOutput,
  BatchWriteItemInput,
  BatchWriteItemOutput,
  DeleteItemInput,
  DeleteItemOutput,
  DynamoDBClient,
  GetItemInput,
  GetItemOutput,
  PutItemInput,
  PutItemOutput,
  QueryCommand,
  QueryInput,
  QueryOutput,
  ScanCommand,
  ScanInput,
  ScanOutput,
  TransactGetItemsInput,
  TransactGetItemsOutput,
  TransactWriteItemsInput,
  TransactWriteItemsOutput,
  UpdateItemInput,
  UpdateItemOutput,
} from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactGetCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {DocumentClientTypes} from '../types/document-client-types';
import {DocumentClient} from './base-document-client';

export class DocumentClientV3<
  DynamoDBDocumentClientType extends DynamoDBDocumentClient = DynamoDBDocumentClient
> extends DocumentClient {
  readonly documentClient: DynamoDBDocumentClientType;
  readonly version = 3;

  constructor(dynamoDBClient: DynamoDBClient) {
    super();
    const marshallOptions = {
      // Whether to automatically convert empty strings, blobs, and sets to `null`.
      convertEmptyValues: false, // false, by default.
      // Whether to remove undefined values while marshalling.
      removeUndefinedValues: false, // false, by default.
      // Whether to convert typeof object to map attribute.
      convertClassInstanceToMap: false, // false, by default.
    };

    const unmarshallOptions = {
      // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
      wrapNumbers: false, // false, by default.
    };

    const translateConfig = {marshallOptions, unmarshallOptions};
    this.documentClient = DynamoDBDocumentClient.from(
      dynamoDBClient,
      translateConfig
    ) as DynamoDBDocumentClientType;
  }

  async put(input: PutItemInput): Promise<PutItemOutput> {
    return this.documentClient.send(new PutCommand(input));
  }

  async get(input: GetItemInput): Promise<GetItemOutput> {
    return this.documentClient.send(new GetCommand(input));
  }

  async query(input: QueryInput): Promise<QueryOutput> {
    return this.documentClient.send(new QueryCommand(input));
  }

  async update(input: UpdateItemInput): Promise<UpdateItemOutput> {
    return this.documentClient.send(new UpdateCommand(input));
  }

  async delete(input: DeleteItemInput): Promise<DeleteItemOutput> {
    return this.documentClient.send(new DeleteCommand(input));
  }

  async batchWrite(input: BatchWriteItemInput): Promise<BatchWriteItemOutput> {
    return this.documentClient.send(new BatchWriteCommand(input));
  }

  // TODO: Fix types declared for the responses and keys
  async batchGet(input: BatchGetItemInput): Promise<BatchGetItemOutput> {
    return this.documentClient.send(new BatchGetCommand(input));
  }

  // FIXME: implement transact raw methods for SDKv3
  transactGetRaw(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    input: DocumentClientTypes.TransactGetItemInput
  ): DocumentClientTypes.Request<DocumentClientTypes.TransactGetItemOutput> {
    throw new Error('Method not implemented.');
  }
  transactWriteRaw(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    input: DocumentClientTypes.TransactWriteItemInput
  ): DocumentClientTypes.Request<DocumentClientTypes.TransactWriteItemOutput> {
    throw new Error('Method not implemented.');
  }

  async transactGet(
    input: TransactGetItemsInput
  ): Promise<TransactGetItemsOutput> {
    return this.documentClient.send(new TransactGetCommand(input));
  }

  async transactWrite(
    input: TransactWriteItemsInput
  ): Promise<TransactWriteItemsOutput> {
    return this.documentClient.send(new TransactWriteCommand(input));
  }

  async scan(input: ScanInput): Promise<ScanOutput> {
    return this.documentClient.send(new ScanCommand(input));
  }
}
