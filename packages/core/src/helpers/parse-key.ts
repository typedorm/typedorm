const regexExp = {
  interpolation: /\{{.+?\}}/g,
  interpolatedWord: /\{{(.+?)\}}/,
};

export function parseKey<Entity>(key: string, dict: Entity) {
  return key.replace(regexExp.interpolation, substr => {
    const match = regexExp.interpolatedWord.exec(substr);
    let variable: any;
    if (match) {
      variable = match[1];
    }
    if (!match || !variable) {
      throw new Error(
        `Failed to parse expression: "${key}", could not find a variable inside "${substr}"`
      );
    }

    const valueToReplace = (dict as any)[variable];
    if (valueToReplace === undefined || valueToReplace === null) {
      throw new Error(`Could not resolve "${variable}" from given dictionary`);
    }

    return valueToReplace.toString();
  });
}
