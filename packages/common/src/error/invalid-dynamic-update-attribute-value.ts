export class InvalidDynamicUpdateAttributeValueError extends Error {
  name = 'InvalidDynamicUpdateAttributeValueError';

  constructor(attributeName: string, attributeValue: any) {
    super();
    this.message = `Invalid dynamic value "${JSON.stringify(
      attributeValue
    )}" received for attribute "${attributeName}".
    Any value that can not be statically recognized is considered a dynamic value, 
    this could either be "SET" action with +,-,[<index>] operators or ADD, DELETE, REMOVE.

    When attribute is referenced in one more "indexes", "primary key" updates or marked as "unique",
    dynamic actions can not be performed.
    `;
  }
}
