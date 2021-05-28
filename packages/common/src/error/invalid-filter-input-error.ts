export class InvalidFilterInputError extends Error {
  name = 'InvalidFilterInputError';

  constructor(input: any) {
    super();
    this.message = `Failed to build filter expression for input: ${JSON.stringify(
      input
    )}.`;
  }
}
