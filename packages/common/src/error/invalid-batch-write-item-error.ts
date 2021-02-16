export class InvalidBatchWriteItemError extends Error {
  name = 'InvalidBatchWriteItemError';

  constructor(input: any) {
    super();
    this.message = `Invalid input ${JSON.stringify(
      input
    )} provided for batch write operation, only "create" and "delete" are supported. `;
  }
}
