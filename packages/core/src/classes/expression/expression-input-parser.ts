import {
  ATTRIBUTE_TYPE,
  RangeOperator,
  ScalarType,
  SimpleOperator,
  UpdateType,
} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {KeyCondition} from './key-condition';
import {Filter} from './filter';
import {BaseExpressionInput, MERGE_STRATEGY} from './base-expression-input';
import {isScalarType} from '../../helpers/is-scalar-type';
import {FilterOptions} from './filter-options-type';
import {ConditionOptions} from './condition-options-type';
import {Condition} from './condition';
import {Projection} from './projection';
import {KeyConditionOptions} from './key-condition-options-type';
import {ProjectionKeys} from './projection-keys-options-type';
import {
  isSetOperatorComplexValueType,
  isSetOperatorValueType,
  UpdateBody,
} from './update-body-type';
import {SetUpdate} from './update/set-update';

/**
 * Parses expression input to expression instances
 */
export class ExpressionInputParser {
  parseToKeyCondition(key: string, options: KeyConditionOptions) {
    return this.operatorToBaseExpression(key, options, new KeyCondition());
  }

  parseToFilter<Entity, PrimaryKey>(
    options: FilterOptions<Entity, PrimaryKey>
  ) {
    return this.recursiveParseToBaseExpression(options, Filter).pop();
  }

  parseToCondition<Entity>(options: ConditionOptions<Entity>) {
    return this.recursiveParseToBaseExpression(options, Condition).pop();
  }

  parseToProjection<Entity>(keys: ProjectionKeys<Entity>) {
    const projection = new Projection();
    projection.addProjectionAttributes(keys as string[]);

    return projection;
  }

  parseToUpdate<Entity, PrimaryKey>(body: UpdateBody<Entity, PrimaryKey>) {
    return this.parseToUpdateExpression(body);
  }

  /**
   * Generic Recursive input parser
   * Recursively parses nested object to build expression of type ExpClass
   * @param options Complex options object to parse
   * @param ExpClass Type of expression to build, can be of type Filter, Condition etc.
   *
   */
  private recursiveParseToBaseExpression<T extends BaseExpressionInput>(
    options: any,
    ExpClass: new () => T
  ) {
    return Object.entries(options).map(
      ([operatorOrAttr, value]): T => {
        // if top level key is one of the logical operators, rerun parse with it's values
        if (['AND', 'OR', 'NOT'].includes(operatorOrAttr)) {
          const parsedExpList = this.recursiveParseToBaseExpression<T>(
            value,
            ExpClass
          );
          const base = parsedExpList.shift();
          if (!base) {
            throw new Error(
              `Value for operator "${operatorOrAttr}" can not be empty`
            );
          }
          switch (operatorOrAttr) {
            case 'AND': {
              if (!parsedExpList?.length) {
                throw new Error(
                  `Value for operator "${operatorOrAttr}" must contain more that 1 attributes.`
                );
              }
              return base.mergeMany(parsedExpList as T[], MERGE_STRATEGY.AND);
            }
            case 'OR': {
              if (!parsedExpList?.length) {
                throw new Error(
                  `Value for operator "${operatorOrAttr}" must contain more that 1 attributes.`
                );
              }
              return base.mergeMany(parsedExpList as T[], MERGE_STRATEGY.OR);
            }
            case 'NOT': {
              if (parsedExpList?.length) {
                throw new Error(
                  `Value for operator "${operatorOrAttr}" can not contain more than 1 attributes.`
                );
              }
              return base.not();
            }
            default: {
              throw new Error(
                `Unsupported logical operator "${operatorOrAttr}"`
              );
            }
          }
        } else {
          // when top level attribute is something other than actual logical operators, try to parse it to expression
          return this.operatorToBaseExpression(
            operatorOrAttr,
            value,
            new ExpClass()
          );
        }
      }
    );
  }

  /**
   * Parses input to update expression
   * @param body body to parse
   */
  private parseToUpdateExpression(body: any) {
    return Object.entries(body)
      .map(([attr, value]) => {
        if (!isSetOperatorValueType(value)) {
          return this.parseSetValueToUpdateExp(attr, value);
          // TODO: replace this with other `ADD`, `DELETE` and `REMOVE` operators
          // } else if (!isAddOperatorValueType(value)) {
          //   throw new Error('Not Implemented!');
        } else {
          // fallback to default `SET` action based update
          return this.parseSetValueToUpdateExp(attr, value);
        }
      })
      .reduce((acc, currExp) => {
        acc.merge(currExp);
        return acc;
      }, new SetUpdate());
  }

  /**
   * Parses single attribute into update expression instance
   * @param attribute name/path of the attribute
   * @param attributeValue value to update
   */
  private parseSetValueToUpdateExp(
    attribute: string,
    attributeValue: any // attribute value before operator extraction
  ): SetUpdate {
    const [operator, operatorValue] = Object.entries(attributeValue)[0] as [
      (
        | UpdateType.ArithmeticOperator
        | UpdateType.SetUpdateOperator
        | UpdateType.Action
      ),
      any
    ];

    const exp = new SetUpdate();
    switch (operator) {
      case 'INCREMENT_BY':
      case 'DECREMENT_BY': {
        return exp.setTo(attribute, operatorValue, operator);
      }
      case 'IF_NOT_EXISTS': {
        if (isSetOperatorComplexValueType(operatorValue)) {
          return exp.setToIfNotExists(
            attribute,
            operatorValue.$VALUE,
            operatorValue.$PATH
          );
        } else {
          return exp.setToIfNotExists(attribute, operatorValue);
        }
      }
      case 'LIST_APPEND': {
        if (isSetOperatorComplexValueType(operatorValue)) {
          return exp.setOrAppendToList(
            attribute,
            operatorValue.$VALUE,
            operatorValue.$PATH
          );
        } else {
          return exp.setOrAppendToList(attribute, operatorValue);
        }
      }
      case 'SET': {
        /**
         * aliased set support, this allows access patterns like
         * {id: { SET: '1'}}
         * behaves similar to {id: '1'}
         */
        return this.parseSetValueToUpdateExp(attribute, operatorValue);
      }
      default: {
        // handle attribute with map type
        return exp.setTo(attribute, attributeValue);
      }
    }
  }

  /**
   * When this is run, it is assumed that attribute/value are validated to not have any nested objects,
   * therefor this function will not running in any recursion itself
   * @param attribute Attribute or path on entity to build comparison condition for
   * @param value value to expect
   * @param exp expression to append operators to
   */
  private operatorToBaseExpression<T extends BaseExpressionInput>(
    attribute: any,
    value: any,
    exp: T
  ) {
    switch (typeof value) {
      case 'string': {
        if (value === 'ATTRIBUTE_EXISTS') {
          exp.attributeExists(attribute);
          return exp;
        } else if (value === 'ATTRIBUTE_NOT_EXISTS') {
          exp.attributeNotExists(attribute);
          return exp;
        } else {
          throw new Error(
            `Operator used must be one of "ATTRIBUTE_EXISTS", "ATTRIBUTE_NOT_EXISTS" for 
            attribute "${attribute}".`
          );
        }
      }
      case 'object': {
        if (isEmptyObject(value)) {
          throw new Error(
            `Value for attribute "${attribute}" can not be empty`
          );
        }

        const operatorAndValue = Object.entries(value);
        if (operatorAndValue.length !== 1) {
          throw new Error(
            `Invalid value "${JSON.stringify(
              value
            )}" found for attribute: ${attribute}`
          );
        }
        const [innerOp, innerVal] = operatorAndValue[0] as [any, ScalarType];

        if (isScalarType(innerVal)) {
          return this.parseScalarValueToExp(innerOp, attribute, innerVal, exp);
        } else {
          return this.parseNonScalarValueToExp(
            innerOp,
            attribute,
            innerVal,
            exp
          );
        }
      }
      default: {
        throw new Error(
          `Value for attribute "${attribute}" must be of type object or string`
        );
      }
    }
  }

  /**
   * Builds comparison expression for operators with scalar values
   * @param operator operator that supports scalar values
   * @param attrPath attribute path to include in built expression
   * @param value value to expect in expression
   * @param exp expression type
   */
  private parseScalarValueToExp<T extends BaseExpressionInput>(
    operator: SimpleOperator | 'BEGINS_WITH' | 'CONTAINS' | 'ATTRIBUTE_TYPE',
    attrPath: string,
    value: ScalarType,
    exp: T
  ) {
    switch (operator) {
      case 'EQ': {
        exp.equals(attrPath, value);
        return exp;
      }
      case 'LT': {
        exp.lessThan(attrPath, value);
        return exp;
      }
      case 'LE': {
        exp.lessThanAndEqualTo(attrPath, value);
        return exp;
      }
      case 'GT': {
        exp.greaterThan(attrPath, value);
        return exp;
      }
      case 'GE': {
        exp.greaterThanAndEqualTo(attrPath, value);
        return exp;
      }
      case 'NE': {
        exp.notEquals(attrPath, value);
        return exp;
      }
      case 'BEGINS_WITH': {
        exp.beginsWith(attrPath, value);
        return exp;
      }
      case 'CONTAINS': {
        exp.contains(attrPath, value);
        return exp;
      }
      case 'ATTRIBUTE_TYPE': {
        exp.attributeType(attrPath, value as ATTRIBUTE_TYPE);
        return exp;
      }
      default: {
        throw new Error(`Unsupported operator: ${operator}`);
      }
    }
  }

  /**
   * Builds comparison expression for operators with Non scalar values, i.e ranges and size
   * @param operator operator that supports scalar values
   * @param attrPath attribute path to include in built expression
   * @param value value to expect in expression
   * @param exp expression type
   */
  private parseNonScalarValueToExp<T extends BaseExpressionInput>(
    operator: RangeOperator | 'SIZE',
    attrPath: string,
    value: any,
    exp: T
  ) {
    switch (operator) {
      case 'BETWEEN': {
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error(
            `Value for operator ${operator} must be of type array with exact two items.`
          );
        }
        exp.between(attrPath, value as [ScalarType, ScalarType]);
        return exp;
      }
      case 'IN': {
        if (!Array.isArray(value) || value.length < 1) {
          throw new Error(
            `Value for operator ${operator} must be of type array with at least one item.`
          );
        }
        exp.in(attrPath, value as ScalarType[]);
        return exp;
      }
      case 'SIZE': {
        const operatorAndValue = Object.entries(value);
        if (operatorAndValue.length !== 1) {
          throw new Error(
            `Invalid value "${JSON.stringify(
              value
            )}" found for operator: ${operator}`
          );
        }
        const [innerOp, innerVal] = operatorAndValue[0] as [any, ScalarType];
        const parsedExp = this.parseScalarValueToExp(
          innerOp,
          attrPath,
          innerVal,
          exp
        );
        // once operator condition has applied, pass it through size
        parsedExp.size(attrPath);
        return parsedExp;
      }
      default: {
        throw new Error(`Unsupported operator: ${operator}`);
      }
    }
  }
}
