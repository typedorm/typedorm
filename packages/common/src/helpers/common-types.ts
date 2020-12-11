import {ObjectType} from './object-type';

export type EntityTarget<Entity> = ObjectType<Entity>;

export type EntityInstance = {
  constructor: Function;
};

export type EntityAttributes<Entity> = {
  [key in keyof Entity]: Entity[key];
};

export const IsEntityInstance = (
  variable: unknown
): variable is EntityInstance =>
  (variable as EntityInstance).constructor instanceof Function;
