export interface BaseAttributeMetadataOptions {
  name: string;
  type: string;
}

export class BaseAttributeMetadata {
  readonly name: string;
  readonly type: string;

  constructor({name, type}: BaseAttributeMetadataOptions) {
    this.name = name;
    this.type = type;
  }
}
