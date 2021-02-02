export class AttributeMetadataUnsupportedDefaultValueError extends Error {
  name = 'AttributeMetadataUnsupportedDefaultValueError';

  constructor(attrName: string, value: any) {
    super();
    this.message = `Default value for attribute "${attrName}" can not be of type "${typeof value}", 
    currently only scalar type and function returning scalar type are supported.`;
  }
}
