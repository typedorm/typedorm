// tslint:disable-next-line: max-line-length
// Ref: https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist/49725198#49725198

import {InvalidType} from './invalid-type';

type InternalPickOne<T, Keys extends keyof T> = {
  [K in Keys]: Required<Pick<T, K>> &
    Partial<Record<Exclude<Keys, K>, InvalidType<T>>>;
}[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> &
  InternalPickOne<T, Keys>;
