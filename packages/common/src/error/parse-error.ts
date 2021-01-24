export class SparseIndexParseError extends Error {
  name = 'SparseIndexParseError';

  constructor(key: string) {
    super();
    this.message = `Failed to parse "${key}"`;
  }
}
