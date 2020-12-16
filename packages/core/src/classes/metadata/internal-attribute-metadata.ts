export interface InternalAttributeMetadataOptions {
  value: any;
  name: string;
  type: string;
}

export class InternalAttributeMetadata {
  readonly value: any;
  readonly name: string;
  readonly type: string;

  constructor({name, type, value}: InternalAttributeMetadataOptions) {
    this.name = name;
    this.type = type;
    this.value = value;
  }
}
