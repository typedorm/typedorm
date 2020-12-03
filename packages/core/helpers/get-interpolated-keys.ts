import {regexInterpolatedWord} from './constants';

export function getInterpolatedKeys(
  key: string,
  dict: {[key: string]: string}
) {
  const matchIterator = key.matchAll(regexInterpolatedWord);
  const interpolatedKeys = [] as string[];
  recursiveFindInterpolatedKeys(key, matchIterator, dict, interpolatedKeys);

  // there shouldn't be any duplicates, still to be double sure remove duplicates if there are any
  return [...new Set(interpolatedKeys)];
}

function recursiveFindInterpolatedKeys(
  key: string,
  iterator: IterableIterator<RegExpMatchArray>,
  dict: {[key: string]: string},
  interpolatedKeys: string[]
) {
  const next = iterator.next();
  if (next.done) {
    return;
  }

  // regex match returns [match, key]
  const variable = next.value[1];
  const variableType = dict[variable];

  if (!variableType) {
    throw new Error(
      `key "${key}" references variable "${variable}" but it could not be resolved`
    );
  }

  if (
    variableType !== 'String' &&
    variableType !== 'Number' &&
    variableType !== 'Boolean'
  ) {
    throw new Error(
      `"${variable}" is used in key ${key}, thus it's type must be a "Number" or a "String"`
    );
  }

  // push interpolated word to array
  interpolatedKeys.push(variable);
  recursiveFindInterpolatedKeys(key, iterator, dict, interpolatedKeys);
}
