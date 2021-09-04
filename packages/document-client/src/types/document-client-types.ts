import {DynamoDB} from 'aws-sdk';
import DynamoDBClientV3 from '@aws-sdk/client-dynamodb';

/* eslint-disable @typescript-eslint/no-namespace */

export namespace DocumentClientTypes {
  export type Key = {
    [key: string]: any;
  };

  export type AttributeMap = {[key: string]: any};

  export type ItemList = AttributeMap[];

  export type BatchGetResponseMap = DynamoDB.DocumentClient.BatchGetResponseMap;

  export type BatchWriteItemRequestMap = DynamoDB.DocumentClient.BatchWriteItemRequestMap;

  export type TransactWriteItemsOutput = DynamoDB.DocumentClient.TransactWriteItemsOutput;

  export type BatchWriteItemOutput = DynamoDB.DocumentClient.BatchWriteItemOutput;

  export type BatchGetRequestMap =
    | DynamoDB.DocumentClient.BatchGetRequestMap
    | DynamoDBClientV3.BatchGetItemOutput;

  export type BatchGetItemOutput =
    | DynamoDB.DocumentClient.BatchGetItemOutput
    | DynamoDBClientV3.BatchGetItemOutput;
}
