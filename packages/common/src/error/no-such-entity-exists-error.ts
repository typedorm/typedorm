export class NoSuchEntityExistsError extends Error {
  name = 'NoSuchEntityExistsError';
  constructor(entityName: string) {
    super();
    this.message = `No such entity named "${entityName}" is known to TypeDORM. If such entity exists, 
    please make sure it is registered to current connection.`;
  }
}
