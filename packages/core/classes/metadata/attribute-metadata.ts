export interface AttributeMetadataOptions {
  unique?: boolean;
  name: string;
  type: string;
}

export class AttributeMetadata {
  readonly unique: boolean;
  readonly name: string;
  readonly type: string;

  constructor({unique, name, type}: AttributeMetadataOptions) {
    this.unique = !!unique;
    this.name = name;
    this.type = type;
  }
}
