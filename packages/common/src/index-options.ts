import { INDEX_TYPE } from './enums';
import { Replace } from './helpers/replace-type';

/** 
  * When a Global Secondary Index(GSI) is created with both a partition key and a sort key, any items added * to the table that lack a partition key or sort key value will be excluded from the index.
  * For GSIs that only have a partition key, the same behaviour applies, but only to the partition key.
  * 
  * In these scenarios `isSparse` should be set to True.
  */
export interface GSIIndexOptions {
  type: INDEX_TYPE.GSI;
  partitionKey: string;
  sortKey?: string;
  isSparse?: boolean;
}

export interface LSIIndexOptions {
  type: INDEX_TYPE.LSI;
  sortKey: string;
  isSparse?: boolean;
}
export type IndexOptions = GSIIndexOptions | LSIIndexOptions;

export type KeyAliasSchema<Entity> = {
  alias: keyof Entity extends infer R ? R : never;
};
export type EntityAliasOrString<Entity> = string | KeyAliasSchema<Entity>;

export type IndexOptionsWithAlias<Entity> =
  | Replace<
    GSIIndexOptions,
    'partitionKey' | 'sortKey',
    {
      partitionKey: EntityAliasOrString<Entity>;
      sortKey: EntityAliasOrString<Entity>;
    }
  >
  | Replace<
    LSIIndexOptions,
    'sortKey',
    {
      sortKey: EntityAliasOrString<Entity>;
    }
  >;
