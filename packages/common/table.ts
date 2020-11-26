import {INDEX_TYPE} from './enums';
export interface TableOptions {
  name: string;
  partitionKey: string; // identifier of partition key
  sortKey?: string; // identifier of sort key
  indexes?: {
    [key: string]: IndexOptions;
  };
}

export interface IndexOptions {
  type: INDEX_TYPE;
  partitionKey?: string;
  sortKey: string;
}

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
    return this.options.sortKey;
  }

  usesCompositeKey() {
    return this.options.partitionKey && this.options.sortKey;
  }

  getIndexByKey(key: string) {
    const {indexes = {}} = this.options;
    return indexes[key];
  }
}
