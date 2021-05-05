import {Attribute, Entity, INDEX_TYPE} from '@typedorm/common';
import {table} from './table';

export interface UserAttrAliasPrimaryKey {
  id: string;
}

export interface UserAttrAliasGSI1 {
  name?: string;
}

@Entity<UserAttrAlias>({
  table,
  name: 'user-attr-alias',
  primaryKey: {
    partitionKey: 'USER#{{id}}',
    sortKey: 'USER#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: {
        alias: 'status',
      },
      sortKey: 'USER#{{name}}',
      type: INDEX_TYPE.GSI,
    },
    LSI1: {
      type: INDEX_TYPE.LSI,
      sortKey: {
        alias: 'age',
      },
    },
  },
})
export class UserAttrAlias
  implements UserAttrAliasPrimaryKey, UserAttrAliasGSI1 {
  @Attribute()
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  status: string;

  @Attribute()
  age: number;
}
