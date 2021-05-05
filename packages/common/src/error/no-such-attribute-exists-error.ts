export class NoSuchAttributeExistsError extends Error {
  name = 'NoSuchAttributeExistsError';

  constructor(attributeName: string, entityName?: string) {
    super();
    this.message = `No such attribute "${attributeName}" exists on entity${
      entityName ? ` ${entityName}.` : '.'
    }`;
  }
}
