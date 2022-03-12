import {DocumentClientTypes} from './../types/document-client-types';
export abstract class DocumentClient {
  abstract readonly version: number;

  abstract put(
    input: DocumentClientTypes.PutItemInput
  ): Promise<DocumentClientTypes.PutItemOutput>;

  abstract get(
    input: DocumentClientTypes.GetItemInput
  ): Promise<DocumentClientTypes.GetItemOutput>;

  abstract query(
    input: DocumentClientTypes.QueryInput
  ): Promise<DocumentClientTypes.QueryOutput>;

  abstract update(
    input: DocumentClientTypes.UpdateItemInput
  ): Promise<DocumentClientTypes.UpdateItemOutput>;

  abstract delete(
    input: DocumentClientTypes.DeleteItemInput
  ): Promise<DocumentClientTypes.DeleteItemOutput>;

  abstract batchWrite(
    input: DocumentClientTypes.BatchWriteItemInput
  ): Promise<DocumentClientTypes.BatchWriteItemOutput>;

  abstract batchGet(
    input: DocumentClientTypes.BatchGetItemInput
  ): Promise<DocumentClientTypes.BatchGetItemOutput>;

  abstract transactGetRaw(
    input: DocumentClientTypes.TransactGetItemInput
  ): DocumentClientTypes.Request<DocumentClientTypes.TransactGetItemOutput>;

  abstract transactGet(
    input: DocumentClientTypes.TransactGetItemInput
  ): Promise<DocumentClientTypes.TransactGetItemOutput>;

  abstract transactWriteRaw(
    input: DocumentClientTypes.TransactWriteItemInput
  ): DocumentClientTypes.Request<DocumentClientTypes.TransactWriteItemOutput>;

  abstract transactWrite(
    input: DocumentClientTypes.TransactWriteItemInput
  ): Promise<DocumentClientTypes.TransactWriteItemOutput>;

  abstract scan(
    input: DocumentClientTypes.ScanInput
  ): Promise<DocumentClientTypes.ScanOutput>;
}
