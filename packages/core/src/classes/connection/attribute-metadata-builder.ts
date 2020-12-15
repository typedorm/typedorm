import {MetadataManager, Table} from '@typedorm/common';
import {AttributeMetadata} from '../metadata/attribute-metadata';
import {
  AutoGeneratedAttributeMetadata,
  IsAutoGeneratedAttributeMetadata,
} from '../metadata/auto-generated-attribute-metadata';

export class AttributesMetadataBuilder {
  constructor() {}

  build(table: Table, entityClass: Function) {
    const getRawAttributesForEntity = MetadataManager.metadataStorage.getRawAttributesForEntity(
      entityClass
    );

    return getRawAttributesForEntity.map(attr => {
      if (IsAutoGeneratedAttributeMetadata(attr)) {
        return new AutoGeneratedAttributeMetadata({
          ...attr,
        });
      }

      return new AttributeMetadata({
        table,
        entityClass,
        ...attr,
      });
    });
  }
}
