import {regexInterpolatedWord} from './constants';

export function getInterpolatedKeys(key: string) {
  const matchIterator = key.matchAll(regexInterpolatedWord);
  const interpolatedKeys = [] as string[];
  recursiveFindInterpolatedKeys(key, matchIterator, interpolatedKeys);

  // there shouldn't be any duplicates, still to be double sure remove duplicates if there are any
  return [...new Set(interpolatedKeys)];
}

function recursiveFindInterpolatedKeys(
  key: string,
  iterator: IterableIterator<RegExpMatchArray>,
  interpolatedKeys: string[]
) {
  const next = iterator.next();
  if (next.done) {
    return;
  }

  // regex match returns [match, key]
  const variable = next.value[1];

  // push interpolated word to array
  interpolatedKeys.push(variable);
  recursiveFindInterpolatedKeys(key, iterator, interpolatedKeys);
}
