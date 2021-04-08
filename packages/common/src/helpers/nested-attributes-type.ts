export type NestedAttributes<Entity, ValueType> = {
  [key in keyof Entity]?: ValueType;
};
