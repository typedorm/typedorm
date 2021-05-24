import {INDEX_TYPE} from './enums';
import {Replace} from './helpers/replace-type';

export interface GSIIndexOptions {
  type: INDEX_TYPE.GSI;
  partitionKey: string;
  sortKey: string;
  /**
   * DynamoDB only adds item to index if both Partition Key and Sort Key defined
   * for any given GSI contains value
   *
   * Indexes missing sort key value will not be added to index.
   */
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
