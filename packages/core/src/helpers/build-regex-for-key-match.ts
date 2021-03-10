/**
 * Builds regex to be used to match generated keys
 * @param keySchema key schema to build regex for | i.e USER#{{id}}
 * @param interpolations list of interpolated words to match | i.e ['id']
 * @returns {
 *            exp: build regular expression
 *            keys: keys in order of match in regex
 *          }
 */
export function buildRegexForKeyMatch(
  keySchema: string,
  interpolations: string[]
): {
  exp: RegExp;
  keys: string[];
} {
  const varsPattern = interpolations.join('|');
  const keysMatcher = new RegExp(`\\{{(${varsPattern})\\}}`, 'gm');

  const keys = [] as string[];
  keySchema = keySchema.replace(keysMatcher, substr => {
    const matchKey = (substr.match(/\{{(.+?)\}}/) ?? [])[1];
    keys.push(matchKey);
    return '(.*)';
  });

  return {
    exp: new RegExp(`^${keySchema}`, 'gm'),
    keys,
  };
}
