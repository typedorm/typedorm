export type PrimaryKeyAttributes<PrimaryKey, ValueType> = {
  [key in keyof PrimaryKey]: ValueType;
};
