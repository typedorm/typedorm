import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
  TransformFromDynamo,
  TransformToDynamo,
} from '@typedorm/common';
import {Transform, Type} from 'class-transformer';
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

@Entity({
  table,
  name: 'photo',
  primaryKey: {
    partitionKey: 'PHOTO#{{category}}',
    sortKey: 'PHOTO#{{id}}',
  },
})
export class Photo {
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
    default: () => new Date().toString(),
  })
  @Type(() => Date)
  @TransformFromDynamo(({value}) => moment(value))
  createdAt: Moment;

  constructor(category: CATEGORY, name: string) {
    this.name = name;
    this.category = category;
  }

  createdDate() {
    return this.createdAt.format('MM-DD-YYYY');
  }
}
