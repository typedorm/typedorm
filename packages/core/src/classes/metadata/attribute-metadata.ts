import {AttributeOptionsUniqueType} from '@typedorm/common';
import {isObject} from '../../helpers/is-object';

export interface AttributeMetadataOptions {
  unique?: AttributeOptionsUniqueType;
  name: string;
  type: string;
}

export class AttributeMetadata {
  readonly unique: AttributeOptionsUniqueType;
  readonly name: string;
  readonly type: string;

  constructor({unique, name, type}: AttributeMetadataOptions) {
    if (!unique) {
      this.unique = false;
    } else if (isObject(unique)) {
      this.unique = unique;
    } else {
      this.unique = !!unique;
    }

    this.name = name;
    this.type = type;
  }
}
