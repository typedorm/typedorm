import {INDEX_TYPE} from './enums';
import {CompositePrimaryKey} from './metadata/metadata-storage';

export const IsCompositePrimaryKey = (
  key: unknown
): key is CompositePrimaryKey =>
  !!(
    (key as CompositePrimaryKey).partitionKey &&
    (key as CompositePrimaryKey).sortKey
  );

export interface TableOptions {
  name: string;
  partitionKey: string; // identifier of partition key
  sortKey?: string; // identifier of sort key
  indexes?: {
    [key: string]: IndexOptions;
  };
}

export interface GSIIndexOptions {
  type: INDEX_TYPE.GSI;
  partitionKey: string;
  sortKey: string;
  isSparse?: boolean;
}

export interface LSIIndexOptions {
  type: INDEX_TYPE.LSI;
  sortKey: string;
  isSparse?: boolean;
}

export type IndexOptions = GSIIndexOptions | LSIIndexOptions;

export class Table {
  constructor(private options: TableOptions) {}

  set name(value: string) {
    this.options.name = value;
  }

  get name() {
    return this.options.name;
  }

  get partitionKey() {
    return this.options.partitionKey;
  }

  get sortKey() {
    if (!IsCompositePrimaryKey(this.options)) {
      throw new Error('Only Tables using composite keys can have sort keys');
    }
    return this.options.sortKey;
  }

  usesCompositeKey() {
    return !!(this.options.partitionKey && this.options.sortKey);
  }

  getIndexByKey(key: string) {
    const {indexes = {}} = this.options;
    return indexes[key];
  }
}
