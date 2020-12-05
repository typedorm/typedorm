import {
  AttributeMetadata,
  AttributeMetadataOptions,
} from './attribute-metadata';

export interface InternalAttributeMetadataOptions
  extends AttributeMetadataOptions {
  value: any;
}

export class InternalAttributeMetadata extends AttributeMetadata {
  readonly value: any;
  constructor(options: InternalAttributeMetadataOptions) {
    super(options);
    this.value = options.value;
  }
}
