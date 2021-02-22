import {buildRegexForKeyMatch} from './build-regex-for-key-match';

export function unParseKey(
  keySchema: string,
  keyToUnParse: string,
  interpolations: string[]
) {
  const {exp: keySchemaExp, keys} = buildRegexForKeyMatch(
    keySchema,
    interpolations
  );

  // first match is the full string, rest will be the values for variables
  const values = keySchemaExp.exec(keyToUnParse)?.splice(1) ?? ([] as any[]);
  return keys.reduce((acc, key, index) => {
    acc[key] = values[index];
    return acc;
  }, {} as Record<string, any>);
}
