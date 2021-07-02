import {UpdateType} from '@typedorm/common';
import {Update} from './update';

export class RemoveUpdate extends Update {
  protected prefix: UpdateType.Action = 'REMOVE';

  remove(
    attrOrPath: string,
    options?: {
      atIndexes?: number[];
    }
  ) {
    if (options && Array.isArray(options.atIndexes)) {
      let fullExp = '';

      // create a string out of all index numbers
      const attrExp = this.addExpressionName(attrOrPath);
      options.atIndexes.forEach((index: number) => {
        if (typeof index !== 'number') {
          throw new Error(
            `Invalid value for $AT_INDEX: ${index}, Index value must be of type number.`
          );
        }
        const segExp = `${attrExp}[${index}]`;
        fullExp += fullExp ? `, ${segExp}` : segExp;
      });

      this.appendToExpression(fullExp);
      return this;
    } else {
      const attrExpName = this.addExpressionName(attrOrPath);
      this.appendToExpression(attrExpName);
      return this;
    }
  }
}
