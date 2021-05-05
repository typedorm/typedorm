export class InvalidAttributeAliasSchemaError extends Error {
  name = 'InvalidAttributeAliasSchemaError';

  constructor(attributeName: any) {
    super();
    this.message = `Attribute "${JSON.stringify(
      attributeName
    )}" did not satisfy alias attribute type constraint.
    Attribute alias must always be of type string.`;
  }
}
