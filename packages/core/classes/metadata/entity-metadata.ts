import {EntityTarget, INDEX_TYPE} from '@typedorm/common';
import {getInterpolatedKeys} from '../../helpers/get-interpolated-keys';
import {validateKey} from '../../helpers/validate-key';
import {Connection} from '../connection/connection';
import {
  EntityRawMetadataOptions,
  Indexes,
  PrimaryKey,
} from '@typedorm/common/metadata-storage';
import {
  IndexOptions,
  IsCompositePrimaryKey,
  Table,
} from '@typedorm/common/table';
import {AttributeMetadata} from './attribute-metadata';
import {AutoGeneratedAttributeMetadata} from './auto-generated-attribute-metadata';
import {BaseMetadata} from './base-metadata';

export type DynamoEntitySchemaPrimaryKey = {
  [key: string]: any;
  _interpolations?: {[key: string]: string[]};
};
export type DynamoEntityIndexesSchema = {
  [key: string]: DynamoEntityIndexSchema;
};

export type DynamoEntityIndexSchema = {
  // auto generated
  _name?: string;
  // for LSI, only contains interpolations for sort key
  _interpolations?: {[key: string]: string[]};
  // entity transformer will inject additional attributes
  [key: string]: any;
} & IndexOptions;

export interface DynamoEntitySchema {
  primaryKey: DynamoEntitySchemaPrimaryKey;
  indexes?: DynamoEntityIndexesSchema;
}

export type AttributeMetadataType =
  | AttributeMetadata
  | AutoGeneratedAttributeMetadata;

export interface EntityMetadataOptions extends EntityRawMetadataOptions {
  connection: Connection;
  attributes: AttributeMetadataType[];
}

export class EntityMetadata extends BaseMetadata {
  readonly name: string;
  readonly table: Table;
  readonly target: EntityTarget<any>;
  readonly attributes: AttributeMetadataType[];
  readonly schema: DynamoEntitySchema;
  constructor({
    connection,
    table,
    name,
    target,
    primaryKey,
    indexes,
    attributes,
  }: EntityMetadataOptions) {
    super(connection);
    this.name = name;
    this.target = target;
    this.attributes = attributes;

    if (table) {
      // if no entity level table is defined fallback to global connection table
      this.table = table;
    } else {
      this.table = connection.table;
    }

    const attributesKeyTypePair = this.attributes.reduce((acc, attr) => {
      acc[attr.name] = attr.type;
      return acc;
    }, {} as {[key: string]: string});

    this.validatePrimaryKey(this.table, primaryKey, attributesKeyTypePair);

    this.schema = {
      primaryKey: this.buildPrimaryKeySchema({
        table: this.table,
        primaryKey,
        attributes: attributesKeyTypePair,
      }),
      indexes: this.buildIndexesSchema({
        table: this.table,
        indexes: {...indexes},
        attributes: attributesKeyTypePair,
      }),
    };
  }

  private validatePrimaryKey(
    table: Table,
    primaryKey: PrimaryKey,
    attributes: {[key: string]: string}
  ) {
    if (IsCompositePrimaryKey(primaryKey)) {
      if (!table.usesCompositeKey()) {
        throw new Error(
          `Table "${table.name}" does not use composite key, thus "${primaryKey.sortKey}" should not exist.`
        );
      }

      validateKey(primaryKey.partitionKey, attributes);
      validateKey(primaryKey.sortKey, attributes);
    } else {
      if (table.usesCompositeKey()) {
        throw new Error(
          `Table "${table.name}" uses composite key as a primary key, thus sort key on entity "${this.target.name}" is required`
        );
      }
      validateKey(primaryKey.partitionKey, attributes);
    }
  }

  private buildPrimaryKeySchema({
    table,
    primaryKey,
    attributes,
  }: {
    table: Table;
    primaryKey: PrimaryKey;
    attributes: {[key: string]: string};
  }) {
    const partitionKeyInterpolations = getInterpolatedKeys(
      primaryKey.partitionKey,
      attributes
    );

    const tablePartitionKeyName = table.partitionKey;
    if (IsCompositePrimaryKey(primaryKey)) {
      const tableSortKeyName = table.sortKey ?? '';
      const sortKeyInterpolations = getInterpolatedKeys(
        primaryKey.sortKey,
        attributes
      );
      return {
        [tablePartitionKeyName]: primaryKey.partitionKey,
        [tableSortKeyName]: primaryKey.sortKey,
        _interpolations: {
          [tablePartitionKeyName]: partitionKeyInterpolations,
          [tableSortKeyName]: sortKeyInterpolations,
        },
      };
    } else {
      return {
        [tablePartitionKeyName]: primaryKey.partitionKey,
        _interpolations: {
          [tablePartitionKeyName]: partitionKeyInterpolations,
        },
      };
    }
  }

  private buildIndexesSchema({
    table,
    indexes,
    attributes,
  }: {
    table: Table;
    indexes: Indexes;
    attributes: {[key: string]: string};
  }) {
    return Object.keys(indexes).reduce((acc, key) => {
      const tableIndexSignature = table.getIndexByKey(key);
      if (!tableIndexSignature) {
        throw new Error(
          `No matching index signature found for index "${key}" in table "${table.name}"`
        );
      }

      const currentIndex = indexes[key];

      // validates and gets and fill set indexes interpolations of sort key
      const sortKeyInterpolations = getInterpolatedKeys(
        currentIndex.sortKey,
        attributes
      );

      if (tableIndexSignature.type === INDEX_TYPE.LSI) {
        if (currentIndex.type !== INDEX_TYPE.LSI) {
          throw new Error('Index signature mismatch.');
        }
        acc[key] = {
          [tableIndexSignature.sortKey]: currentIndex.sortKey,
          type: tableIndexSignature.type,
          _name: key,
          _interpolations: {
            [tableIndexSignature.sortKey]: sortKeyInterpolations,
          },
        };
        return acc;
      } else {
        if (currentIndex.type !== INDEX_TYPE.GSI) {
          throw new Error('Index signature mismatch.');
        }
        // validates and gets and fill set indexes interpolations of partition key
        const partitionKeyInterpolations = getInterpolatedKeys(
          currentIndex.partitionKey,
          attributes
        );

        acc[key] = {
          [tableIndexSignature.partitionKey]: currentIndex.partitionKey,
          [tableIndexSignature.sortKey]: currentIndex.sortKey,
          type: tableIndexSignature.type,
          _name: key,
          // remove any duplicates from partition or sort keys
          _interpolations: {
            [tableIndexSignature.partitionKey]: partitionKeyInterpolations,
            [tableIndexSignature.sortKey]: sortKeyInterpolations,
          },
        };
        return acc;
      }
    }, {} as any);
  }
}