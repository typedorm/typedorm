import { DynamoDB } from 'aws-sdk';

export abstract class BaseManager {
  protected _dc: DynamoDB.DocumentClient;
  constructor() {
    this._dc = new DynamoDB.DocumentClient();
  }
}
