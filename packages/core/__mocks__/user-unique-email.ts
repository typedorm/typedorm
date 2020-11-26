import {INDEX_TYPE} from '@typedorm/common';
import {Attribute} from '@typedorm/common/decorators/attribute.decorator';
import {Entity} from '@typedorm/common/decorators/entity.decorator';
import {table} from './table';

export interface UserUniqueEmailPrimaryKey {
  id: string;
}

export interface UserUniqueEmailGSI1 {
  status: string;
  name?: string;
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
      partitionKey: 'USER#STATUS#{{status}}',
      sortKey: 'USER#{{name}}',
      type: INDEX_TYPE.GSI,
    },
  },
})
export class UserUniqueEmail
  implements UserUniqueEmailPrimaryKey, UserUniqueEmailGSI1 {
  @Attribute()
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  status: string;

  @Attribute({
    unique: true,
  })
  email: string;
}
