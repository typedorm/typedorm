import {
  UpdateType,
  UpdateAttributes,
  RequireOnlyOne,
  InvalidType,
} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
/**
 * Type Guards
 */
export const isSetOperatorValueType = (
  value: any
): value is SetUpdateBody<any, any> => {
  const operators: Array<
    | UpdateType.ArithmeticOperator
    | UpdateType.SetUpdateOperator
    | Extract<UpdateType.Action, 'SET'>
  > = ['INCREMENT_BY', 'DECREMENT_BY', 'IF_NOT_EXISTS', 'LIST_APPEND', 'SET'];
  const key = Object.keys(value)[0] as typeof operators[0];
  return !!operators.includes(key);
};

export const isAddOperatorValueType = (
  value: any
): value is AddUpdateBody<any, any> => {
  const operators: Array<UpdateType.Action> = ['ADD'];
  const key = Object.keys(value)[0] as typeof operators[0];
  return !!operators.includes(key);
};

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

type SetUpdateBody<Entity, AdditionalProperties> = {
  // implicit set  type
  [enKey in keyof Entity]?: SetValueType<Entity, enKey>;
} &
  {
    // implicit set  type
    [additionalKey in keyof AdditionalProperties]?: SetValueType<
      AdditionalProperties,
      additionalKey
    >;
  };

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

type AddUpdateBody<Entity, AdditionalProperties> = {
  // ADD type
  [enKey in keyof Entity]?: AddValueType<Entity, enKey>;
} &
  {
    // additional attributes
    [additionalKey in keyof AdditionalProperties]?: AddValueType<
      AdditionalProperties,
      additionalKey
    >;
  };
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

type RemoveUpdateBody<Entity, AdditionalProperties> = {
  // REMOVE type
  [enKey in keyof Entity]?: RemoveValueType<Entity, enKey>;
} &
  {
    // additional attributes
    [additionalKey in keyof AdditionalProperties]?: RemoveValueType<
      AdditionalProperties,
      additionalKey
    >;
  };
// **************************************

/**
 * Update Body
 */
export type UpdateBody<Entity, AdditionalProperties> =
  | SetUpdateBody<Entity, AdditionalProperties>
  | AddUpdateBody<Entity, AdditionalProperties>
  | RemoveUpdateBody<Entity, AdditionalProperties>;
