import {Attribute, Entity, INDEX_TYPE} from '@typedorm/common';
import {table} from './table';

export interface UserSparseIndexesPrimaryKey {
  id: string;
}

export interface UserSparseIndexesGSI1 {
  status: string;
  name?: string;
}

@Entity({
  table,
  name: 'user-sparse-indexes',
  primaryKey: {
    partitionKey: 'USER_SPARSE_INDEXES#{{id}}',
    sortKey: 'USER_SPARSE_INDEXES#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: 'USER_SPARSE_INDEXES#STATUS#{{status}}',
      sortKey: 'USER_SPARSE_INDEXES#{{name}}',
      type: INDEX_TYPE.GSI,
      isSparse: true,
    },
    LSI1: {
      // isSparse: true, all indexes are sparse by default
      sortKey: 'AGE#{{age}}',
      type: INDEX_TYPE.LSI,
    },
  },
})
export class UserSparseIndexes
  implements UserSparseIndexesPrimaryKey, UserSparseIndexesGSI1
{
  @Attribute()
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  status: string;

  @Attribute()
  age: number;
}
