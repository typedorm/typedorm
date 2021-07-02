import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
  INDEX_TYPE,
  TransformFromDynamo,
  TransformToDynamo,
} from '@typedorm/common';
import {table} from './table';

// Moment is only being used here to display the usage of @transform utility
// eslint-disable-next-line node/no-extraneous-import
import moment from 'moment';
// eslint-disable-next-line node/no-extraneous-import
import {Moment} from 'moment';

export enum CATEGORY {
  PETS = 'PETS',
  KIDS = 'KIDS',
}

export interface PhotoPrimaryKey {
  category: CATEGORY;
  id: number;
}

@Entity({
  table,
  name: 'photo',
  primaryKey: {
    partitionKey: 'PHOTO#{{category}}',
    sortKey: 'PHOTO#{{id}}',
  },
  indexes: {
    GSI1: {
      partitionKey: 'PHOTO#{{id}}',
      sortKey: 'PHOTO#{{category}}',
      type: INDEX_TYPE.GSI,
    },
  },
})
export class Photo implements PhotoPrimaryKey {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: number;

  @Attribute()
  @TransformToDynamo(({value}) => {
    if (value === CATEGORY.KIDS) {
      return 'kids-new';
    } else {
      return value;
    }
  })
  category: CATEGORY;

  @Attribute()
  name: string;

  @Attribute({
    default: () => new Date().toISOString(),
  })
  @TransformToDynamo(({value}: {value: Date}) =>
    moment(value, moment.ISO_8601).utc().format('yyyy-MM-DD')
  )
  @TransformFromDynamo(({value}) => moment(value, 'yyyy-MM-DD'))
  createdAt: Moment;

  constructor(category: CATEGORY, name: string) {
    this.name = name;
    this.category = category;
  }

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH_DATE,
    autoUpdate: true,
  })
  @TransformToDynamo(({value}) => {
    return value.toString();
  })
  updatedAt: Date;

  createdDate() {
    return this.createdAt.format('MM-DD-YYYY');
  }
}
