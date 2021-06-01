export class InvalidPrimaryKeyAttributesUpdateError extends Error {
  name = 'InvalidPrimaryKeyAttributesUpdateError';

  constructor(
    affectedPrimaryKeyAttributes: Record<string, string>,
    nonKeyAttributes: string[]
  ) {
    super();
    this.message = `Primary key attribute and non primary key attributes can not be
    updated together. When updating attributes that references a primary key, it can not have
    additional non key attributes.
    \n Affected Primary key attributes: ${JSON.stringify(
      affectedPrimaryKeyAttributes
    )}
    \n Tried to update non-key attributes: ${JSON.stringify(nonKeyAttributes)}`;
  }
}
