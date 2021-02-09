export type RequireAtLeastTwo<T, Keys extends keyof T = keyof T> = Omit<
  T,
  Keys
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys] &
  {
    [K in Keys]-?: Required<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
