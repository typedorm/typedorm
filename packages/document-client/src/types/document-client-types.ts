import AWS, {DynamoDB} from 'aws-sdk';
import DynamoDBClientV3 from '@aws-sdk/client-dynamodb';

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

  export type WriteRequest =
    | DynamoDB.DocumentClient.WriteRequest
    | DynamoDBClientV3.WriteRequest;

  export type Request<T> = AWS.Request<T, AWS.AWSError>;

  export type ItemResponse =
    | AWS.DynamoDB.DocumentClient.ItemResponse
    | DynamoDBClientV3.ItemResponse;

  export type ItemResponseList = ItemResponse[];

  /**
   * Put
   */
  export type PutItemInput =
    | DynamoDB.DocumentClient.PutItemInput
    | DynamoDBClientV3.PutItemInput;

  export type PutItemOutput =
    | DynamoDB.DocumentClient.PutItemOutput
    | DynamoDBClientV3.PutItemOutput;

  /**
   * Get
   */
  export type GetItemInput =
    | DynamoDB.DocumentClient.GetItemInput
    | DynamoDBClientV3.GetItemInput;

  export type GetItemOutput =
    | DynamoDB.DocumentClient.GetItemOutput
    | DynamoDBClientV3.GetItemOutput;

  /**
   * Update
   */
  export type Update = DynamoDB.DocumentClient.Update | DynamoDBClientV3.Update;

  export type UpdateItemInput =
    | DynamoDB.DocumentClient.UpdateItemInput
    | DynamoDBClientV3.UpdateItemInput;

  export type UpdateItemOutput =
    | DynamoDB.DocumentClient.UpdateItemOutput
    | DynamoDBClientV3.UpdateItemOutput;

  /**
   * Delete
   */
  export type DeleteItemInput =
    | DynamoDB.DocumentClient.DeleteItemInput
    | DynamoDBClientV3.DeleteItemInput;

  export type DeleteItemOutput =
    | DynamoDB.DocumentClient.DeleteItemOutput
    | DynamoDBClientV3.DeleteItemOutput;

  /**
   * Query
   */
  export type QueryInput =
    | DynamoDB.DocumentClient.QueryInput
    | DynamoDBClientV3.QueryInput;

  export type QueryOutput =
    | DynamoDB.DocumentClient.QueryOutput
    | DynamoDBClientV3.QueryOutput;

  /**
   * BatchWrite
   */
  export type BatchWriteItemRequestMap =
    | DynamoDB.DocumentClient.BatchWriteItemRequestMap
    | {
        [key: string]: DynamoDBClientV3.WriteRequest[];
      };

  export type BatchWriteItemRequestMapList = BatchWriteItemRequestMap[];

  export type BatchWriteItemInput =
    | DynamoDB.DocumentClient.BatchWriteItemInput
    | DynamoDBClientV3.BatchWriteItemInput;

  export type BatchWriteItemOutput =
    | DynamoDB.DocumentClient.BatchWriteItemOutput
    | DynamoDBClientV3.BatchWriteItemOutput;

  export type BatchWriteItemOutputList = BatchWriteItemOutput[];

  /**
   * BatchGet
   */
  export type BatchGetRequestMap =
    | DynamoDB.DocumentClient.BatchGetRequestMap
    | {
        [key: string]: DynamoDBClientV3.KeysAndAttributes;
      };

  export type BatchGetRequestMapList = BatchGetRequestMap[];

  export type BatchGetItemInput =
    | DynamoDB.DocumentClient.BatchGetItemInput
    | DynamoDBClientV3.BatchGetItemInput;

  export type BatchGetItemOutput =
    | DynamoDB.DocumentClient.BatchGetItemOutput
    | DynamoDBClientV3.BatchGetItemOutput;

  export type BatchGetItemOutputList = BatchGetItemOutput[];

  export type BatchGetResponseMap =
    | DynamoDB.DocumentClient.BatchGetResponseMap
    | {[key: string]: ItemList};

  /**
   * TransactWrite
   */
  export type TransactWriteItem =
    | DynamoDB.DocumentClient.TransactWriteItem
    | DynamoDBClientV3.TransactWriteItem;

  export type TransactWriteItemList = TransactWriteItem[];

  export type TransactWriteItemInput =
    | DynamoDB.DocumentClient.TransactWriteItemsInput
    | DynamoDBClientV3.TransactWriteItemsInput;

  export type TransactWriteItemOutput =
    | DynamoDB.DocumentClient.TransactWriteItemsOutput
    | DynamoDBClientV3.TransactWriteItemsOutput;

  /**
   * TransactGet
   */
  export type TransactGetItem =
    | DynamoDB.DocumentClient.TransactGetItem
    | DynamoDBClientV3.TransactGetItem;

  export type TransactGetItemList = TransactGetItem[];

  export type TransactGetItemInput =
    | DynamoDB.DocumentClient.TransactGetItemsInput
    | DynamoDBClientV3.TransactGetItemsInput;

  export type TransactGetItemOutput =
    | DynamoDB.DocumentClient.TransactGetItemsOutput
    | DynamoDBClientV3.TransactGetItemsOutput;

  /**
   * Scan
   */
  export type ScanInput =
    | DynamoDB.DocumentClient.ScanInput
    | DynamoDBClientV3.ScanInput;

  export type ScanOutput =
    | DynamoDB.DocumentClient.ScanOutput
    | DynamoDBClientV3.ScanOutput;
}
