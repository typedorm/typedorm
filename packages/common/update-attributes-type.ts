import {NonKeyAttributes} from './non-key-attributes-type';
export type UpdateAttributes<PrimaryKey, Entity> = NonKeyAttributes<
  PrimaryKey,
  Entity,
  any
> & {
  [key: string]: any;
};
