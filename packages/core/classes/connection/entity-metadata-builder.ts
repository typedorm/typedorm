import {MetadataManager} from '@typedorm/common';
import {
  AttributeMetadataType,
  EntityMetadata,
} from '../metadata/entity-metadata';
import {AttributesMetadataBuilder} from './attribute-metadata-builder';
import {Connection} from './connection';

export class EntityMetadataBuilder {
  private attributesMetadataBuilder: AttributesMetadataBuilder;
  constructor(private connection: Connection) {
    this.attributesMetadataBuilder = new AttributesMetadataBuilder();
  }
  build(entityClasses: Function[]): EntityMetadata[] {
    return entityClasses.map(entityClass => {
      const inheritedClasses = this.recursiveGetInheritanceTree(entityClass);

      // metadata are sorted by [very base class] -> [very derived class]
      const inheritedEntitiesAttributesMetadata = inheritedClasses
        .map(inheritedClass =>
          this.attributesMetadataBuilder.build(inheritedClass)
        )
        .reverse();

      const deNormalizedAttributesMap = inheritedEntitiesAttributesMetadata
        .flat()
        .reduce((acc, current) => {
          // when inherited class defined same attribute again with different config, it should be used over base class
          // attribute definition on child class take precedence over base class
          acc.set(current.name, current);
          return acc;
        }, new Map<string, AttributeMetadataType>());

      // reverse to return [very derived class] -> [very base class] attributes
      const allAttributesForEntity = Array.from(
        deNormalizedAttributesMap.values()
      ).reverse();

      const {
        target,
        table,
        name,
        primaryKey,
        indexes,
      } = MetadataManager.metadataStorage.getRawEntityByTarget(entityClass);

      // At the moment we do simple store metadata and retrieve for entities,
      // this however needs to support extending Entity

      return new EntityMetadata({
        connection: this.connection,
        table,
        target,
        attributes: allAttributesForEntity,
        name,
        primaryKey,
        indexes,
      });
    });
  }

  /**
   * Returns inheritance tree of given entity
   * Inheritance tree includes entities from current -> very child -> very parent
   * @param entityClass
   * @param tree
   * @returns [originalEntity, parent of originalEntity as parent1, parent of parent1 as parent2]
   */
  private recursiveGetInheritanceTree(
    entityClass: Function,
    tree: Function[] = []
  ): Function[] {
    tree.push(entityClass);
    const proto = Object.getPrototypeOf(entityClass);
    if (proto && proto.name) {
      return this.recursiveGetInheritanceTree(proto, tree);
    }
    return tree;
  }
}
