import {UpdateType, RequireOnlyOne, InvalidType} from '@typedorm/common';
import {isEmptyObject} from '@typedorm/common';

/**
 * Type Guards
 */
export const isSetOperatorComplexValueType = (
  value: any
): value is {$PATH: string; $VALUE: any} => {
  return !!(!isEmptyObject(value) && value['$PATH']);
};

/**
 * **********************************
 * Set Action
 */
type AbstractSetValueType<
  Entity,
  enKey extends keyof Entity
> = (Entity[enKey] extends number
  ? {
      [key in UpdateType.ArithmeticOperator]?: number;
    }
  : Entity[enKey] extends any[]
  ? {
      LIST_APPEND?: Entity[enKey] | {$VALUE: Entity[enKey]; $PATH: string};
    }
  : {}) & {
  IF_NOT_EXISTS?: Entity[enKey] | {$VALUE: Entity[enKey]; $PATH: string};
};

type SetImplicitValueType<Entity, enKey extends keyof Entity> =
  | RequireOnlyOne<
      // set value type
      AbstractSetValueType<Entity, enKey>
    >
  // simple attribute type value
  | Entity[enKey];

type SetExplicitValueType<Entity, enKey extends keyof Entity> = RequireOnlyOne<{
  SET?:
    | AbstractSetValueType<Entity, enKey>
    // simple attribute type value
    | Entity[enKey];
}>;

type SetValueType<Entity, enKey extends keyof Entity> =
  | SetImplicitValueType<Entity, enKey>
  // explicit set  type
  // almost identical to implicit type but has more explicit syntax
  | SetExplicitValueType<Entity, enKey>;
// **************************************

/**
 * *************************************
 * ADD Action
 */
type AddValueType<Entity, enKey extends keyof Entity> = RequireOnlyOne<{
  ADD?: Entity[enKey] extends number | any[]
    ? Entity[enKey]
    : InvalidType<
        [
          'number | any[]',
          "Update action 'ADD' can not be used for attribute",
          enKey
        ]
      >;
}>;
// **************************************

/**
 * *************************************
 * REMOVE Action
 */
type RemoveValueType<Entity, enKey extends keyof Entity> = RequireOnlyOne<{
  REMOVE?: Entity[enKey] extends any[]
    ? {$AT_INDEX: number[]} | boolean
    : boolean;
}>;
// **************************************

/**
 * *************************************
 * DELETE Action
 */
type DeleteValueType<Entity, enKey extends keyof Entity> = RequireOnlyOne<{
  DELETE?: Entity[enKey] extends any[]
    ? Entity[enKey]
    : InvalidType<
        [any[], "Update action 'DELETE' can not be used for attribute", enKey]
      >;
}>;
// **************************************

/**
 * Update Body
 */
export type UpdateBody<Entity, AdditionalProperties> = {
  // implicit set  type
  [enKey in keyof Entity]?:
    | SetValueType<Entity, enKey>
    | AddValueType<Entity, enKey>
    | RemoveValueType<Entity, enKey>
    | DeleteValueType<Entity, enKey>;
} & {
  // implicit set  type
  [additionalKey in keyof AdditionalProperties]?:
    | SetValueType<AdditionalProperties, additionalKey>
    | AddValueType<AdditionalProperties, additionalKey>
    | RemoveValueType<AdditionalProperties, additionalKey>
    | DeleteValueType<AdditionalProperties, additionalKey>;
};
