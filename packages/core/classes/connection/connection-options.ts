import {EntityTarget, Table} from '@typedorm/common';

export interface ConnectionOptions {
  table?: Table;
  name?: string;
  dynamoQueryItemsImplicitLimit?: number;
  entities: EntityTarget<any>[] | string;
}
