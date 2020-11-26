import {INDEX_TYPE} from '@typedorm/common/enums';
import {Attribute} from '@typedorm/common/decorators/attribute.decorator';
import {Entity} from '@typedorm/common/decorators/entity.decorator';
import {table} from './table';

export interface OrganisationPrimaryKey {
  id: string;
}

@Entity({
  table,
  name: 'organisation',
  primaryKey: {
    partitionKey: 'ORG#{{id}}',
    sortKey: 'ORG#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: 'ORG#{{id}}#STATUS#{{status}}',
      sortKey: 'ORG#{{name}}#ACTIVE#{{active}}',
      type: INDEX_TYPE.GSI,
    },
    GSI2: {
      partitionKey: 'ORG#{{id}}#STATUS#{{status}}',
      sortKey: 'ORG#{{name}}#TEAM_COUNT#{{teamCount}}',
      type: INDEX_TYPE.GSI,
    },
  },
})
export class Organisation implements OrganisationPrimaryKey {
  @Attribute()
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  status: string;

  @Attribute()
  active: boolean;

  @Attribute()
  teamCount: number;
}
