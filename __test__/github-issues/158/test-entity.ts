import {Attribute, Entity, INDEX_TYPE} from '@typedorm/common';
const uuid4 = () => '12345678';

@Entity({
  name: 'sample-entity',
  primaryKey: {
    partitionKey: 'en#' + uuid4(),
    sortKey: 'root',
  },
  indexes: {
    [process.env.EMAIL_INDEX!]: {
      type: INDEX_TYPE.GSI,
      partitionKey: '{{email}}',
      sortKey: '',
    },
  },
})
export default class EntityData {
  @Attribute()
  name!: string;

  @Attribute()
  email!: string;
}
