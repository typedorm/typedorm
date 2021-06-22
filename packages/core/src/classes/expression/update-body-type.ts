import {
  RequireAtLeastOne,
  UpdateType,
  UpdateAttributes,
  InvalidType,
  RequireOnlyOne,
} from '@typedorm/common';

type SetUpdateBody<Entity, PrimaryKey> = {
  // implicit set  type
  [enKey in keyof Entity]?:
    | RequireOnlyOne<
        (Entity[enKey] extends number
          ? {
              [key in UpdateType.ArithmeticOperator]?: number;
            }
          : Entity[enKey] extends any[]
          ? {
              LIST_APPEND?:
                | Entity[enKey]
                | {
                    [key in keyof Omit<
                      Entity,
                      enKey
                    >]?: Entity[key] extends any[]
                      ? Entity[key]
                      : InvalidType<
                          [Entity[key], "Can not be used with 'LIST_APPEND'"]
                        >;
                  };
            }
          : {}) & {
          IF_NOT_EXISTS?:
            | Entity[enKey]
            | {[key in keyof Omit<Entity, enKey>]?: Entity[key]};
        }
      >
    // explicit set  type
    // almost identical to implicit type but has more explicit syntax
    | RequireOnlyOne<{
        SET?:
          | Entity[enKey]
          | ((Entity[enKey] extends number
              ? {
                  [key in UpdateType.ArithmeticOperator]?: number;
                }
              : Entity[enKey] extends any[]
              ? {
                  LIST_APPEND?:
                    | Entity[enKey]
                    | {
                        [key in keyof Omit<
                          Entity,
                          enKey
                        >]?: Entity[key] extends any[]
                          ? Entity[key]
                          : InvalidType<
                              [
                                Entity[key],
                                "Can not be used with 'LIST_APPEND'"
                              ]
                            >;
                      };
                }
              : {}) & {
              IF_NOT_EXISTS?:
                | Entity[enKey]
                | {[key in keyof Omit<Entity, enKey>]?: Entity[key]};
            });
      }>
    // or simple attribute type value
    | Entity[enKey];
} &
  UpdateAttributes<Entity, PrimaryKey>;

export type UpdateBody<Entity, PrimaryKey> = RequireAtLeastOne<
  SetUpdateBody<Entity, PrimaryKey>
>;
