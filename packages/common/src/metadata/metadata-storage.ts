import {AUTO_GENERATE_ATTRIBUTE_STRATEGY, EntityTarget} from '@typedorm/common';
import {IndexOptions, Table} from '../table';
import {AttributeOptionsUniqueType} from '../decorators/attribute.decorator';

export type PrimaryKey = SimplePrimaryKey | CompositePrimaryKey;
export type SimplePrimaryKey = {
  partitionKey: string;
};

export type CompositePrimaryKey = {
  partitionKey: string;
  sortKey: string;
};

export type Indexes = {
  [key: string]: IndexOptions;
};

export interface EntityRawMetadataOptions {
  name: string;
  target: EntityTarget<any>;
  primaryKey: PrimaryKey;
  indexes?: Indexes;
  table?: Table;
}

export interface AttributeRawMetadataOptions {
  name: string;
  type: any;
  unique?: AttributeOptionsUniqueType;
}

export interface AutoGenerateAttributeRawMetadataOptions
  extends AttributeRawMetadataOptions {
  strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY;
  autoUpdate?: boolean;
}

export class MetadataStorage {
  private _entities: Map<string, EntityRawMetadataOptions>;
  private _attributes: Map<
    string,
    Map<
      string,
      AttributeRawMetadataOptions | AutoGenerateAttributeRawMetadataOptions
    >
  >;

  constructor() {
    this._entities = new Map();
    this._attributes = new Map();
  }

  hasKnownEntityByName(name: string) {
    return this._entities.has(name);
  }

  getRawAttributesForEntity<Entity>(entityClass: EntityTarget<Entity>) {
    const attributes = this._attributes.get(entityClass.name)?.values();

    if (!attributes) {
      throw new Error(`No entity with name "${entityClass.name}" could be resolved, 
      make sure they have been declared at the connection creation time.`);
    }
    return Array.from(attributes);
  }

  getRawEntityByTarget<Entity>(entityClass: EntityTarget<Entity>) {
    const entity = this._entities.get(entityClass.name);

    if (!entity) {
      throw new Error(`No entity with name "${entityClass.name}" could be resolved, 
      make sure they have been declared at the connection creation time.`);
    }
    return entity;
  }

  addRawAttribute<Entity>(
    entityClass: EntityTarget<Entity>,
    attribute: AttributeRawMetadataOptions
  ) {
    let attributesForEntity = this._attributes.get(entityClass.name);

    if (!attributesForEntity) {
      attributesForEntity = new Map();
    }

    attributesForEntity.set(attribute.name, attribute);
    this._attributes.set(entityClass.name, attributesForEntity);
  }

  addRawEntity(entity: EntityRawMetadataOptions) {
    this._entities.set(entity.target.name, entity);
  }

  get entities() {
    return Array.from(this._entities.values());
  }

  get attributes() {
    return Array.from(this._attributes.values()).map(attr =>
      Array.from(attr.values())
    );
  }
}
