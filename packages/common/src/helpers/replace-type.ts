export type Replace<T, K extends keyof T, R> = Omit<T, K> & R;
