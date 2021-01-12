const regexExp = {
  interpolation: /\{{.+?\}}/g,
  interpolatedWord: /\{{(.+?)\}}/,
};

export function parseKey<Entity>(
  key: string,
  dict: Entity,
  {isSparseIndex}: {isSparseIndex: boolean} = {isSparseIndex: false}
) {
  try {
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
        const error = new Error(
          `"${variable}" was referenced in ${key} but it's value could not be resolved.`
        );

        if (isSparseIndex) {
          (error as any).reason = 'SPARSE_INDEX';
        }
        throw error;
      }

      return valueToReplace.toString();
    });
  } catch (err) {
    if (err.reason === 'SPARSE_INDEX') {
      return '';
    } else {
      throw err;
    }
  }
}
