import {
  EntityAliasOrString,
  InvalidAttributeAliasSchemaError,
  NoSuchAttributeExistsError,
} from '@typedorm/common';
import {regexInterpolatedWord} from './constants';
import {isKeyOfTypeAliasSchema} from './is-key-of-type-alias-schema';

/**
 *
 * @param key key to validate
 * @param dict dictionary to validate key against, dictionary of attribute { name: type }
 */
export function validateKey(
  key: EntityAliasOrString<any>,
  dict: {[key: string]: string},
  entityName?: string
) {
  // validate aliases
  if (isKeyOfTypeAliasSchema(key)) {
    if (typeof key.alias !== 'string') {
      throw new InvalidAttributeAliasSchemaError(key.alias as any);
    }

    const aliasType = dict[key.alias];

    if (!aliasType) {
      throw new NoSuchAttributeExistsError(key.alias, entityName);
    }
    // return when successfully validated
    return;
  }
  const matchIterator = key.matchAll(regexInterpolatedWord);
  validateMatch(key, matchIterator, dict);
  return;
}

function validateMatch(
  key: string,
  iterator: IterableIterator<RegExpMatchArray>,
  dict: {[key: string]: string}
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

  if (
    variableType !== 'String' &&
    variableType !== 'Number' &&
    variableType !== 'Boolean'
  ) {
    throw new Error(
      `"${variable}" is used in key ${key}, thus it's type must be or scalar type, if attribute type is Enum, please set "isEnum" to true in attribute decorator.`
    );
  }

  validateMatch(key, iterator, dict);
}
