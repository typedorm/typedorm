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
  TransactionCanceledException,
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
import {TransactionCancelledException} from '../exceptions';
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

  async batchGet(input: BatchGetItemInput): Promise<BatchGetItemOutput> {
    return this.documentClient.send(new BatchGetCommand(input));
  }

  async transactGet(
    input: TransactGetItemsInput
  ): Promise<TransactGetItemsOutput> {
    return this.documentClient.send(new TransactGetCommand(input));
  }

  async transactWrite(
    input: TransactWriteItemsInput
  ): Promise<TransactWriteItemsOutput> {
    try {
      const response = await this.documentClient.send(
        new TransactWriteCommand(input)
      );
      return response;
    } catch (err) {
      if (err instanceof TransactionCanceledException) {
        // Remap TransactionCanceledException to unified TransactionCancelledException
        throw new TransactionCancelledException(
          err.Message || err.message,
          err.CancellationReasons?.map(reason => ({
            code: reason.Code,
            message: reason.Message,
            item: reason.Item,
          })) || []
        );
      }
      throw err;
    }
  }

  async scan(input: ScanInput): Promise<ScanOutput> {
    return this.documentClient.send(new ScanCommand(input));
  }
}
