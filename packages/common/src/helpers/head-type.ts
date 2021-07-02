export type HeadType<T extends any[]> = T extends [any, ...any[]]
  ? T[0]
  : never;
