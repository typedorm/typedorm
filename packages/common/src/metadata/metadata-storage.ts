import {AUTO_GENERATE_ATTRIBUTE_STRATEGY, EntityTarget} from '@typedorm/common';
import {IndexOptions, Table} from '../table';
import {AttributeOptionsUniqueType} from '../decorators/attribute.decorator';
import {ScalarType} from '../helpers/scalar-type';

export const IsAutoGenerateAttributeRawMetadataOptions = (
  attr: any
): attr is AutoGenerateAttributeRawMetadataOptions => !!attr.strategy;

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

interface BaseAttributeRawMetadataOptions {
  name: string;
  type: any;
  hidden?: boolean;
}
export interface AttributeRawMetadataOptions
  extends BaseAttributeRawMetadataOptions {
  unique?: AttributeOptionsUniqueType;
  default?: ScalarType | (() => ScalarType);
}

export interface AutoGenerateAttributeRawMetadataOptions
  extends BaseAttributeRawMetadataOptions {
  strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY;
  autoUpdate?: boolean;
}

export class MetadataStorage {
  private _entities: Map<EntityTarget<any>, EntityRawMetadataOptions>;
  private _attributes: Map<
    EntityTarget<any>,
    Map<
      string,
      AttributeRawMetadataOptions | AutoGenerateAttributeRawMetadataOptions
    >
  >;

  constructor() {
    this._entities = new Map();
    this._attributes = new Map();
  }

  /**
   * Get entity metadata by entity physical name
   * Physical name refers to value set to "name" property on @Entity
   * @param name entity physical name
   */
  getEntityByName(name: string) {
    return this.entities.find(en => en.name === name);
  }

  hasKnownEntity<Entity>(entityClass: EntityTarget<Entity>) {
    return this._entities.has(entityClass);
  }

  getRawAttributesForEntity<Entity>(entityClass: EntityTarget<Entity>) {
    const attributes = this._attributes.get(entityClass)?.values();

    if (!attributes) {
      throw new Error(`No entity with name "${entityClass.name}" could be resolved, 
      make sure they have been declared at the connection creation time.`);
    }
    return Array.from(attributes);
  }

  getRawEntityByTarget<Entity>(entityClass: EntityTarget<Entity>) {
    const entity = this._entities.get(entityClass);

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
    let attributesForEntity = this._attributes.get(entityClass);

    if (!attributesForEntity) {
      attributesForEntity = new Map();
    }

    attributesForEntity.set(attribute.name, attribute);
    this._attributes.set(entityClass, attributesForEntity);
  }

  addRawEntity(entity: EntityRawMetadataOptions) {
    this._entities.set(entity.target, entity);
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
