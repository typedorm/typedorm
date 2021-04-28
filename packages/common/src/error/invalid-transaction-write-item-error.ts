export class InvalidTransactionWriteItemError extends Error {
  name = 'InvalidTransactionWriteItemError';

  constructor(input: any) {
    super();
    this.message = `Invalid input ${JSON.stringify(
      input
    )} provided for transaction write operation, only "create", "update" and "delete" are supported.`;
  }
}
