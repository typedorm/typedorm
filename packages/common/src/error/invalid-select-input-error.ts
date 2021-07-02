export class InvalidSelectInputError extends Error {
  name = 'InvalidSelectInputError';

  constructor(input: any) {
    super();
    this.message = `Failed to build projection expression for input: ${JSON.stringify(
      input
    )}.`;
  }
}
