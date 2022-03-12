import {AUTO_GENERATE_ATTRIBUTE_STRATEGY, EntityTarget} from '@typedorm/common';
import {Table} from '../table';
import {AttributeOptionsUniqueType} from '../decorators/attribute.decorator';
import {ScalarType} from '../helpers/scalar-type';
import {IndexOptionsWithAlias} from '../index-options';

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

export type Indexes<Entity = any> = {
  [key: string]: IndexOptionsWithAlias<Entity>;
};

export interface EntityRawMetadataOptions<Entity = any> {
  name: string;
  target: EntityTarget<Entity>;
  primaryKey: PrimaryKey;
  indexes?: Indexes<Entity>;
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
      // it is possible that entity might not have any attributes referenced such cases are
      // when inherited entity contains all the attribute declarations and derived ones only defines schema for it
      // Thus, instead of throwing an error, simply return [] list to continue processing other attributes
      return [];
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
