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
  QueryInput,
  QueryOutput,
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
  QueryCommand,
  ScanCommand,
  TransactGetCommand,
  TransactWriteCommand,
  TranslateConfig,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {isEmptyObject} from '@typedorm/core/src/helpers/is-empty-object';
import {DEFAULT_TRANSLATE_CONFIG_V3} from '../constants/translate-config';
import {TransactionCancelledException} from '../exceptions';
import {DocumentClient} from './base-document-client';

export class DocumentClientV3<
  DynamoDBDocumentClientType extends DynamoDBDocumentClient = DynamoDBDocumentClient
> extends DocumentClient {
  readonly documentClient: DynamoDBDocumentClientType;
  readonly version = 3;

  constructor(
    dynamoDBClient: DynamoDBClient,
    customTranslateConfig?: TranslateConfig
  ) {
    super();

    const translateConfig = {
      marshallOptions:
        (customTranslateConfig &&
          !isEmptyObject(customTranslateConfig.marshallOptions) && {
            ...DEFAULT_TRANSLATE_CONFIG_V3.marshallOptions,
            ...customTranslateConfig.marshallOptions,
          }) ||
        DEFAULT_TRANSLATE_CONFIG_V3.marshallOptions,
      unmarshallOptions:
        (customTranslateConfig &&
          !isEmptyObject(customTranslateConfig.marshallOptions) && {
            ...DEFAULT_TRANSLATE_CONFIG_V3.unmarshallOptions,
            ...customTranslateConfig.unmarshallOptions,
          }) ||
        DEFAULT_TRANSLATE_CONFIG_V3.unmarshallOptions,
    };

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
