import { regexInterpolatedWord } from './constants';

/**
 *
 * @param key key to validate
 * @param dict dictionary to validate key against, dictionary of attribute { name: type }
 */
export function validateKey(key: string, dict: { [key: string]: string }) {
  const matchIterator = key.matchAll(regexInterpolatedWord);
  validateMatch(key, matchIterator, dict);
}

function validateMatch(
  key: string,
  iterator: IterableIterator<RegExpMatchArray>,
  dict: { [key: string]: string }
) {
  const next = iterator.next();
  if (next.done) {
    return;
  }

  const variable = next.value[1];
  const variableType = dict[variable];

  if (!variableType) {
    throw new Error(
      `key "${key}" references variable "${variable}" but it could not be resolved`
    );
  }

  if (variableType !== 'String' && variableType !== 'Number') {
    throw new Error(
      `"${variable}" is used in key ${key}, thus it's type must be a "Number" or a "String"`
    );
  }

  validateMatch(key, iterator, dict);
}
