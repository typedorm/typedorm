import {ATTRIBUTE_TYPE, ScalarType, SimpleOperator} from '@typedorm/common';

const lastCharSpaceMatcher = /\s$/;
export enum MERGE_STRATEGY {
  AND = 'AND',
  OR = 'OR',
}

export abstract class BaseExpressionInput {
  expression: string;
  _names?: {[key: string]: any};
  _values?: {[key: string]: any};

  constructor() {
    this.expression = '';
  }

  set names(value: any) {
    this._names = {
      ...this.names,
      ...value,
    };
  }

  get names() {
    return this._names ?? {};
  }

  set values(value: any) {
    this._values = {
      ...this.values,
      ...value,
    };
  }

  get values() {
    return this._values ?? {};
  }

  protected abstract getExpNameKey(key: string): string;

  protected abstract getExpValueKey(key: string): string;

  protected appendToExpression(segment: string) {
    if (!segment) {
      return;
    }

    if (this.expression.length === 0) {
      this.expression += segment;
      return;
    }

    if (!this.hasSpaceInLastChar(this.expression)) {
      this.expression += ' '; // append empty space if does not exist
    }

    this.expression += segment;
  }

  protected addExpressionName(name: string) {
    const expressionPrefixedName = this.getExpNameKey(name);
    if (this.names[expressionPrefixedName]) {
      throw new Error(
        `There is already an expression name with key ${expressionPrefixedName}.`
      );
    }
    this.names = {
      ...this.names,
      [expressionPrefixedName]: name,
    };
    return expressionPrefixedName;
  }

  protected addExpressionValue(name: string, value: any) {
    const expressionPrefixedValue = this.getExpValueKey(name);
    if (this.values[expressionPrefixedValue]) {
      throw new Error(
        `There is already an expression value with key ${expressionPrefixedValue}.`
      );
    }
    this.values = {
      ...this.values,
      [expressionPrefixedValue]: value,
    };
    return expressionPrefixedValue;
  }

  merge(
    condition: BaseExpressionInput,
    strategy: MERGE_STRATEGY = MERGE_STRATEGY.AND
  ): this {
    const {expression, names, values} = condition;

    // empty condition then return
    if (!expression) {
      return this;
    }

    if (strategy === MERGE_STRATEGY.OR) {
      this.or().appendToExpression(`(${expression})`);
    } else {
      this.and().appendToExpression(`(${expression})`);
    }

    Object.keys(names).forEach(nameKey => {
      if (this.names[nameKey]) {
        throw new Error(
          `Failed to merge expression attribute names, there are multiple attributes names with key "${nameKey}"`
        );
      }
    });
    Object.keys(values).forEach(valueKey => {
      if (this.names[valueKey]) {
        throw new Error(
          `Failed to merge expression attribute values, there are multiple attributes values with key "${valueKey}"`
        );
      }
    });
    this.names = {...this.names, ...names};
    this.values = {...this.values, ...values};

    return this;
  }

  mergeMany<T extends BaseExpressionInput>(
    inputs: T[],
    strategy: MERGE_STRATEGY
  ) {
    inputs.forEach(input => {
      this.merge(input, strategy);
    });
    return this;
  }

  and(): this {
    this.expression = `(${this.expression})`;
    this.appendToExpression('AND');
    return this;
  }

  not(): this {
    this.expression = `NOT (${this.expression})`;
    return this;
  }

  or(): this {
    this.expression = `(${this.expression})`;
    this.appendToExpression('OR');
    return this;
  }

  beginsWith(key: string, substring: ScalarType): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, substring);
    this.appendToExpression(`begins_with (${attrExpName}, ${attrExpValue})`);
    return this;
  }

  contains(key: string, value: ScalarType): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);
    this.appendToExpression(`contains (${attrExpName}, ${attrExpValue})`);
    return this;
  }

  attributeType(key: string, type: ATTRIBUTE_TYPE): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, type);
    this.appendToExpression(`attribute_type (${attrExpName}, ${attrExpValue})`);
    return this;
  }

  attributeExists(attr: string): this {
    const attrName = this.addExpressionName(attr);
    this.appendToExpression(`attribute_exists (${attrName})`);
    return this;
  }

  attributeNotExists(attr: string): this {
    const attrName = this.addExpressionName(attr);
    this.appendToExpression(`attribute_not_exists (${attrName})`);
    return this;
  }

  equals(key: string, value: ScalarType): this {
    return this.addBaseOperator('EQ', key, value);
  }

  lessThan(key: string, value: ScalarType): this {
    return this.addBaseOperator('LT', key, value);
  }

  lessThanAndEqualTo(key: string, value: ScalarType): this {
    return this.addBaseOperator('LE', key, value);
  }

  greaterThan(key: string, value: ScalarType): this {
    return this.addBaseOperator('GT', key, value);
  }

  greaterThanAndEqualTo(key: string, value: ScalarType): this {
    return this.addBaseOperator('GE', key, value);
  }

  notEquals(key: string, value: ScalarType): this {
    return this.addBaseOperator('NE', key, value);
  }

  between(key: string, value: [ScalarType, ScalarType]): this {
    if (value.length !== 2) {
      throw new Error(
        'Incorrect query value for BETWEEN operator, it requires array containing two values.'
      );
    }
    const [startIncluding, endIncluding] = value;
    const attrExpName = this.addExpressionName(key);
    const attrExpValueStart = this.addExpressionValue(
      `${key}_start`,
      startIncluding
    );
    const attrExpValueEnd = this.addExpressionValue(`${key}_end`, endIncluding);

    this.appendToExpression(
      `${attrExpName} BETWEEN ${attrExpValueStart} AND ${attrExpValueEnd}`
    );
    return this;
  }

  in(key: string, values: ScalarType[]): this {
    if (values.length < 1) {
      throw new Error(
        'Incorrect value for IN operator, it requires array containing at lease one SCALAR type value.'
      );
    }

    const attrExpName = this.addExpressionName(key);
    const attrExpValue = values.reduce((acc, value, index) => {
      const attrExpValueStart = this.addExpressionValue(
        `${key}_${index}`,
        value
      );
      acc += attrExpValueStart;
      if (index !== values.length - 1) {
        // if not last index append separator followed by space
        acc += ', ';
      }
      return acc;
    }, '');

    this.appendToExpression(`${attrExpName} IN (${attrExpValue})`);
    return this;
  }

  size(key: string): this {
    const attrExpName = this.getExpNameKey(key);
    this.expression = this.expression.replace(
      attrExpName,
      `size (${attrExpName})`
    );
    return this;
  }

  addBaseOperator(operator: SimpleOperator, key: string, value: any): this {
    const attrExpName = this.addExpressionName(key);
    const attrExpValue = this.addExpressionValue(key, value);
    this.appendToExpression(
      `${attrExpName} ${this.getSymbolForOperator(operator)} ${attrExpValue}`
    );
    return this;
  }

  private getSymbolForOperator(operator: SimpleOperator): string {
    const symbolMap = {
      EQ: '=',
      LE: '<=',
      LT: '<',
      GE: '>=',
      GT: '>',
      NE: '<>',
    };
    return symbolMap[operator];
  }

  private hasSpaceInLastChar(match: string) {
    return lastCharSpaceMatcher.test(match);
  }
}
