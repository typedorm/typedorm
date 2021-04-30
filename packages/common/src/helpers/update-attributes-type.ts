import {NonKeyAttributes} from './non-key-attributes-type';
export type UpdateAttributes<Entity, PrimaryKey> = NonKeyAttributes<
  Entity,
  PrimaryKey
> & {
  // this is required to support additional nested attributes that may exist on the entity
  // i.e when trying to use nested attribute like this `user.name.firstName`.
  [key: string]: any;
};
