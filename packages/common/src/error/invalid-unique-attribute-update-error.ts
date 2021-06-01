export class InvalidUniqueAttributeUpdateError extends Error {
  name = 'InvalidUniqueAttributeUpdateError';

  constructor(primaryKey: Record<string, string>, attributes: string[]) {
    super();
    this.message = `Updates on a unique attributes is not supported when it is also referenced by 
    primary key.
    \n Affected primary key: ${JSON.stringify(primaryKey)}.
    \n Unique Attributes tried to update: ${JSON.stringify(attributes)}.
    \n If this is something you would like to have implemented, please file a new issue.`;
  }
}
