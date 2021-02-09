export type RequireAtLeastTwo<T, Keys extends keyof T = keyof T> = Omit<
  T,
  Keys
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys] &
  {
    [Y in Keys]-?: Required<Pick<T, Exclude<Keys, Extract<Keys, Y>>>>;
  }[Keys];
