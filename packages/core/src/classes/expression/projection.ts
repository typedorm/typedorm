import {BaseExpressionInput} from './base-expression-input';

export class Projection extends BaseExpressionInput {
  getExpNameKey(key: string): string {
    return `#PE_${key}`;
  }

  addProjectionAttributes(projectionKeys: string[]) {
    // remove duplicates
    projectionKeys = [...new Set(projectionKeys)];

    // add all keys to expression attributes list
    const scopedKeys = projectionKeys.map(key => {
      return this.addExpressionName(key);
    });

    const expression = scopedKeys.join(', ');
    this.appendToExpression(expression);
    return this;
  }

  getExpValueKey(key: string): string {
    throw new Error(
      `Failed to parse exp key ${key}, Projection expression does not support specifying value`
    );
  }
}
