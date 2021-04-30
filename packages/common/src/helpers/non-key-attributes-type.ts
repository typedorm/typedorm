export type NonKeyAttributes<Entity, PrimaryKey> = {
  [key in keyof Omit<Entity, keyof PrimaryKey>]?: Entity[key];
};
