import {DocumentClientV2} from '../classes/document-client-v2';
import AWS, {DynamoDB} from 'aws-sdk';
import DynamoDBClientV3 from '@aws-sdk/client-dynamodb';

/**
 * !!important!! Experiment with generics to provider stronger typing
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace DocumentClientTypes {
  /**
   * General
   */
  export type Key = {
    [key: string]: any;
  };

  export type AttributeMap = {[key: string]: any};

  export type ItemList = AttributeMap[];

  export type WriteRequest<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.WriteRequest
    : DynamoDBClientV3.WriteRequest;

  export type Request<T> = AWS.Request<T, AWS.AWSError>;

  /**
   * Put
   */
  export type PutItemInput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.PutItemInput
    : DynamoDBClientV3.PutItemInput;

  export type PutItemOutput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.PutItemOutput
    : DynamoDBClientV3.PutItemOutput;

  /**
   * Get
   */
  export type GetItemInput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.GetItemInput
    : DynamoDBClientV3.GetItemInput;

  export type GetItemOutput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.GetItemOutput
    : DynamoDBClientV3.GetItemOutput;

  /**
   * Update
   */
  export type Update<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.Update
    : DynamoDBClientV3.Update;

  export type UpdateItemInput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.UpdateItemInput
    : DynamoDBClientV3.UpdateItemInput;

  export type UpdateItemOutput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.UpdateItemOutput
    : DynamoDBClientV3.UpdateItemOutput;

  /**
   * Delete
   */
  export type DeleteItemInput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.DeleteItemInput
    : DynamoDBClientV3.DeleteItemInput;

  export type DeleteItemOutput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.DeleteItemOutput
    : DynamoDBClientV3.DeleteItemOutput;

  /**
   * Query
   */
  export type QueryInput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.QueryInput
    : DynamoDBClientV3.QueryInput;

  export type QueryOutput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.QueryOutput
    : DynamoDBClientV3.QueryOutput;

  /**
   * BatchWrite
   */
  export type BatchWriteItemRequestMap<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchWriteItemRequestMap
    : {
        [key: string]: DynamoDBClientV3.WriteRequest[];
      };

  export type BatchWriteItemRequestMapList<
    T = DocumentClientV2
  > = BatchWriteItemRequestMap<T>[];

  export type BatchWriteItemInput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchWriteItemInput
    : DynamoDBClientV3.BatchWriteItemInput;

  export type BatchWriteItemOutput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchWriteItemOutput
    : DynamoDBClientV3.BatchWriteItemOutput;

  export type BatchWriteItemOutputList<
    T = DocumentClientV2
  > = BatchWriteItemOutput<T>[];

  /**
   * BatchGet
   */
  export type BatchGetRequestMap<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchGetRequestMap
    : {
        [key: string]: DynamoDBClientV3.KeysAndAttributes;
      };

  export type BatchGetRequestMapList<T = DocumentClientV2> = BatchGetRequestMap<
    T
  >[];

  export type BatchGetItemInput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchGetItemInput
    : DynamoDBClientV3.BatchGetItemInput;

  export type BatchGetItemOutput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchGetItemOutput
    : DynamoDBClientV3.BatchGetItemOutput;

  export type BatchGetItemOutputList<T = DocumentClientV2> = BatchGetItemOutput<
    T
  >[];

  export type BatchGetResponseMap<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.BatchGetResponseMap
    : {[key: string]: ItemList};

  /**
   * TransactWrite
   */
  export type TransactWriteItem<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.TransactWriteItem
    : DynamoDBClientV3.TransactWriteItem;

  export type TransactWriteItemList<T = DocumentClientV2> = TransactWriteItem<
    T
  >[];

  export type TransactWriteItemInput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.TransactWriteItemsInput
    : DynamoDBClientV3.TransactWriteItemsInput;

  export type TransactWriteItemOutput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.TransactWriteItemsOutput
    : DynamoDBClientV3.TransactWriteItemsOutput;

  /**
   * TransactGet
   */
  export type TransactGetItem<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.TransactGetItem
    : DynamoDBClientV3.TransactGetItem;

  export type TransactGetItemList<T = DocumentClientV2> = TransactGetItem<T>[];

  export type TransactGetItemInput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.TransactGetItemsInput
    : DynamoDBClientV3.TransactGetItemsInput;

  export type TransactGetItemOutput<
    T = DocumentClientV2
  > = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.TransactGetItemsOutput
    : DynamoDBClientV3.TransactGetItemsOutput;

  /**
   * Scan
   */
  export type ScanInput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.ScanInput
    : DynamoDBClientV3.ScanInput;

  export type ScanOutput<T = DocumentClientV2> = T extends DocumentClientV2
    ? DynamoDB.DocumentClient.ScanOutput
    : DynamoDBClientV3.ScanOutput;
}
