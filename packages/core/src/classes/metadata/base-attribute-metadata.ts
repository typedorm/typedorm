export interface BaseAttributeMetadataOptions {
  name: string;
  type: string;
  hidden?: boolean;
}

export class BaseAttributeMetadata {
  readonly name: string;
  readonly type: string;
  readonly hidden?: boolean;

  constructor({name, type, hidden}: BaseAttributeMetadataOptions) {
    this.name = name;
    this.type = type;
    this.hidden = hidden;
  }
}
