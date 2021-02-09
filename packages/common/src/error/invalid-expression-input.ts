export class InvalidExpressionInputError extends Error {
  name = 'InvalidExpressionInputError';

  constructor(key: string, options: unknown) {
    super();
    this.message = `Invalid expression input found for key "${key}". Received input: ${JSON.stringify(
      options
    )}`;
  }
}
