import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
  INDEX_TYPE,
} from '@typedorm/common';
import {table} from './table';

export interface UserAutoGenerateAttributesPrimaryKey {
  id: string;
}

@Entity({
  table,
  name: 'user-auto-generate-attr',
  primaryKey: {
    partitionKey: 'USER#{{id}}',
    sortKey: 'USER#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: 'USER#UPDATED_AT#{{updatedAt}}',
      sortKey: 'USER#{{id}}',
      type: INDEX_TYPE.GSI,
      isSparse: false,
    },
  },
})
export class UserAutoGenerateAttributes
  implements UserAutoGenerateAttributesPrimaryKey
{
  @Attribute()
  id: string;

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH_DATE,
    autoUpdate: true,
  })
  private readonly updatedAt: string;
}
