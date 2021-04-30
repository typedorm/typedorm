export type NonKeyAttributesWithReturnType<Entity, PrimaryKey, ReturnType> = {
  [key in keyof Omit<Entity, keyof PrimaryKey>]?: ReturnType | Entity[key];
};
