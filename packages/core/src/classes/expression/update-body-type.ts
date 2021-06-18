import {
  RequireAtLeastOne,
  UpdateType,
  UpdateAttributes,
  UPDATE_KEYWORD,
  InvalidType,
  RequireOnlyOne,
} from '@typedorm/common';

type SetUpdateBody<Entity, PrimaryKey> = {
  // require one of the advanced props setup
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
                          [key, "Can not be used with 'LIST_APPEND'"]
                        >;
                  };
            }
          : {}) & {
          IF_NOT_EXISTS?:
            | Entity[enKey]
            | {[key in keyof Omit<Entity, enKey>]: Entity[key]};
        }
      >
    // or simple attribute type value
    | Entity[enKey];
} &
  UpdateAttributes<Entity, PrimaryKey>;

// type SetUpdateBody<Entity, PrimaryKey> =
//   | UpdateAttributes<Entity, PrimaryKey>
//   | {
//       [enKey in keyof Entity]: Entity[enKey] extends number
//         ? {
//             [key in UpdateType.ArithmeticOperator]: number;
//           } &
//             {
//               [key in UpdateType.SetUpdateOperator]: Entity[enKey];
//             } & {
//               IF_NOT_EXISTS:
//                 | Entity[enKey]
//                 | {[key in keyof Omit<Entity, enKey>]: Entity[enKey]};
//             } & {
//               LIST_APPEND:
//                 | (Entity[enKey] extends Array<any>
//                     ? Entity[enKey]
//                     : TypeError<
//                         '"LIST_APPEND" can only be used with attributes of type list.'
//                       >)
//                 | {
//                     [key in keyof Omit<
//                       Entity,
//                       enKey
//                     >]: Entity[enKey] extends Array<any>
//                       ? Entity[enKey]
//                       : TypeError<
//                           '"LIST_APPEND" can only be used with attributes of type list.'
//                         >;
//                   };
//             }
//         : {
//             [key in UpdateType.SetUpdateOperator]:
//               | Entity[enKey]
//               | {[key in keyof Omit<Entity, enKey>]: Entity[enKey]};
//           };
//     };

export type UpdateBody<Entity, PrimaryKey> = RequireAtLeastOne<
  SetUpdateBody<Entity, PrimaryKey> & {
    [UPDATE_KEYWORD.SET]: SetUpdateBody<Entity, PrimaryKey>;
  }
>;
