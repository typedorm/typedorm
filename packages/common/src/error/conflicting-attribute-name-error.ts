export class ConflictingAttributeNameError extends Error {
  name = 'ConflictingAttributeNameError';

  constructor({
    attributeName,
    entity,
    tableName,
  }: {
    attributeName: string;
    entity: string;
    tableName: string;
  }) {
    super();

    this.message = `Attribute name "${attributeName}" can not be used for other entity "${entity}".    
    The table "${tableName}" has a partition key or sort key with the same name.`;
  }
}
