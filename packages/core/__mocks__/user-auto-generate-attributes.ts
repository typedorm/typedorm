import {AUTO_GENERATE_ATTRIBUTE_STRATEGY, INDEX_TYPE} from '@typedorm/common';
import {Attribute} from '../../common/decorators/attribute.decorator';
import {AutoGenerateAttribute} from '../../common/decorators/auto-generate-attribute.decorator';
import {Entity} from '../../common/decorators/entity.decorator';
import {table} from './table';

export interface UserAutoGenerateAttributesPrimaryKey {
  id: string;
}

@Entity({
  table,
  name: 'user',
  primaryKey: {
    partitionKey: 'USER#{{id}}',
    sortKey: 'USER#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: 'USER#UPDATED_AT#{{updatedAt}}',
      sortKey: 'USER#{{id}}',
      type: INDEX_TYPE.GSI,
    },
  },
})
export class UserAutoGenerateAttributes
  implements UserAutoGenerateAttributesPrimaryKey {
  @Attribute()
  id: string;

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH_DATE,
    autoUpdate: true,
  })
  private readonly updatedAt: string;
}
