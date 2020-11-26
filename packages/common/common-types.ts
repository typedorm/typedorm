import {ObjectType} from './object-type';

export type EntityTarget<Entity> = ObjectType<Entity>;

export type EntityAttributes<Entity> = {
  [key in keyof Entity]: Entity[key];
};

export const IsEntityTarget: any = (
  variable: any
): variable is EntityTarget<any> => !!variable.constructor;
