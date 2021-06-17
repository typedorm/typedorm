import {NonKeyAttributes} from './non-key-attributes-type';

// additional `{}` is required to support additional nested attributes that may exist on the entity directly
// i.e when trying to use nested attribute like this `user.name.firstName`.
export type UpdateAttributes<Entity, PrimaryKey> =
  | NonKeyAttributes<Entity, PrimaryKey>
  // support updating primary key attributes
  | Partial<PrimaryKey>
  | {};
