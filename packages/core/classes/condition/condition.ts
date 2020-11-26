import { BaseCondition } from './base-condition';

export class Condition extends BaseCondition {
  constructor(prefix?: string) {
    super();
    this.expression = prefix ?? '';
  }

  attributeNotExist(attributeKey: string): Condition {
    const attrExpName = this.addExpressionName(attributeKey);
    this.appendToExpression(`attribute_not_exists(${attrExpName})`);

    return this;
  }

  getExpNameKey(key: string) {
    return `#CE_${key}`;
  }

  getExpValueKey(key: string) {
    return `:CE_${key}`;
  }
}
