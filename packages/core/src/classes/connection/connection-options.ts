import {DocumentClient} from '@typedorm/document-client';
import {EntityTarget, Table} from '@typedorm/common';

/**
 * @param table - Global table to use for all entities, entity scoped table takes precedence over this
 * @param name - Connection name
 * @param dynamoQueryItemsImplicitLimit - Implicit limit to apply when querying items, this will be overridden by explicit limit
 * @param entities - List of entity classes or global pattern string matching all entities
 * @param documentClient - Document client to use for this connection
 */
export interface ConnectionOptions {
  /**
   * @default - none
   */
  table?: Table;
  /**
   * @default - 'default'
   */
  name?: string;
  /**
   * @default 3000
   */
  dynamoQueryItemsImplicitLimit?: number;
  entities: EntityTarget<any>[] | string;
  /**
   * @default - new document client instance with default config will be instantiated
   */
  documentClient?: DocumentClient | unknown;
}
