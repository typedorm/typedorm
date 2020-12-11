export type NonKeyAttributes<PrimaryKey, Entity, ValueType> = {
  [key in keyof Omit<Entity, keyof PrimaryKey>]?: ValueType;
};
