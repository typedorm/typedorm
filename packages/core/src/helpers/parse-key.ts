import {EntityAliasOrString, SparseIndexParseError} from '@typedorm/common';
import {isKeyOfTypeAliasSchema} from './is-key-of-type-alias-schema';

const regexExp = {
  interpolation: /\{{.+?\}}/g,
  interpolatedWord: /\{{(.+?)\}}/,
};

export function parseKey<Entity>(
  key: EntityAliasOrString<any>,
  dict: Entity,
  {isSparseIndex}: {isSparseIndex: boolean} = {isSparseIndex: false}
) {
  if (isKeyOfTypeAliasSchema(key)) {
    const aliasAttr = key.alias as string;
    const aliasValue = (dict as any)[aliasAttr];
    if (aliasValue) {
      return aliasValue;
    }

    if (!aliasValue) {
      const error = new Error(
        `"attribute alias ${key} was found but it's value could not be resolved.`
      );

      if (isSparseIndex) {
        throw new SparseIndexParseError(aliasAttr);
      }
      throw error;
    }
    return aliasValue;
  } else {
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

        // this is what tells transformer to ignore including parsed values
        if (isSparseIndex) {
          throw new SparseIndexParseError(key);
        }
        throw error;
      }

      return valueToReplace.toString();
    });
  }
}
