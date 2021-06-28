export class InvalidDynamicUpdateAttributeValueError extends Error {
  name = 'InvalidDynamicUpdateAttributeValueError';

  constructor(indexName: string, attributeName: string, attributeValue: any) {
    super();
    this.message = `Invalid dynamic value "${JSON.stringify(
      attributeValue
    )}" received for attribute "${attributeName}".
    Any value that can not be statically recognized is considered a dynamic value, 
    this could either be "SET" action with +,-,[<index>] operators or ADD, DELETE, REMOVE.

    When attribute is referenced in one more indexes or primary key updates with dynamic actions 
    can not be performed.
    Here, Index "${indexName}" references attribute "${attributeName}" but 
    also requested to perform update with dynamic actions.
    `;
  }
}
