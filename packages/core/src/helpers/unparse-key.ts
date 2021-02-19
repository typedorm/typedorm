export function unParseKey(
  keySchema: string,
  keyToUnParse: string,
  interpolations: string[]
) {
  const varsPattern = interpolations.join('|');
  const keysMatcher = new RegExp(`\\{{(${varsPattern})\\}}`, 'gm');

  // replace keys {{id}} with (.*) as matchers
  const keys = [] as string[];
  keySchema = keySchema.replace(keysMatcher, substr => {
    const matchKey = (substr.match(/\{{(.+?)\}}/) ?? [])[1];
    keys.push(matchKey);
    return '(.*)';
  });

  // build regex from new key schema
  const keySchemaExp = new RegExp(`^${keySchema}`, 'gm');

  // first match is the full string, rest will be the values for variables
  const values = keySchemaExp.exec(keyToUnParse)?.splice(1) ?? ([] as any[]);
  return keys.reduce((acc, key, index) => {
    acc[key] = values[index];
    return acc;
  }, {} as Record<string, any>);
}
