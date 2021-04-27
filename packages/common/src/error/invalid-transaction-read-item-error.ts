export class InvalidTransactionReadItemError extends Error {
  name = 'InvalidTransactionReadItemError';

  constructor(input: any) {
    super();
    this.message = `Invalid input ${JSON.stringify(
      input
    )} provided for transaction get operation, only "get" is supported.`;
  }
}
