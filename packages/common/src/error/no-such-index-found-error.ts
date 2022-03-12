export class NoSuchIndexFoundError extends Error {
  name = 'NoSuchIndexFoundError';

  constructor(tableName: string, indexName: string) {
    super();
    this.message = `No such index "${indexName}" was found on table "${tableName},"
    Please check if you have provided correct index option and it was configured correctly.`;
  }
}
