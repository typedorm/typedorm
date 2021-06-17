import {
  NonKeyAttributes,
  RequireAtLeastOne,
  UpdateAttributes,
  UPDATE_KEYWORD,
} from '@typedorm/common';

type SetUpdateBody<Entity, PrimaryKey> = UpdateAttributes<Entity, PrimaryKey>;

export type UpdateBody<Entity, PrimaryKey> = RequireAtLeastOne<{
  [UPDATE_KEYWORD.SET]: SetUpdateBody<Entity, PrimaryKey>;
}>;
