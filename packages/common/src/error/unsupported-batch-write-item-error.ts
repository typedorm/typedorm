export class UnsupportedBatchWriteItemError extends Error {
  name = 'UnsupportedBatchWriteItemError';

  constructor(input: any) {
    super();
    this.message = `Unsupported input ${JSON.stringify(
      input
    )} provided for batch write operation, only "create" and "delete" are supported. `;
  }
}
