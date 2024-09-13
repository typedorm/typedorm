import {
  ATTRIBUTE_TYPE,
  RangeOperator,
  ScalarType,
  SimpleOperator,
  UpdateType,
  isEmptyObject,
  isObject,
} from '@typedorm/common';
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
import {isSetOperatorComplexValueType, UpdateBody} from './update-body-type';
import {SetUpdate} from './update/set-update';
import {AddUpdate} from './update/add-update';
import {Update} from './update/update';

import {DeleteUpdate} from './update/delete-update';
import {RemoveUpdate} from './update/remove-update';
import {nestedKeyAccessRegex} from '../../helpers/constants';

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

  parseToUpdate<Entity, AdditionalProperties = {}>(
    body: UpdateBody<Entity, AdditionalProperties>,
    attrValueOverrideMap: Record<string, any> = {}
  ) {
    return this.parseToUpdateExpression(body, attrValueOverrideMap);
  }

  /**
   * Parses complex update object to a value and type
   */
  parseAttributeToUpdateValue(
    attr: string,
    value: any
  ): {value: any; type: 'static' | 'dynamic'} {
    if (isObject(value) && !isEmptyObject(value)) {
      const [operator, operatorValue] = Object.entries(value as any)[0];

      const parsedUpdate = this.parseValueToUpdateExp(
        attr,
        value,
        operator as any,
        operatorValue
      );

      const parsedValue = Object.values(parsedUpdate.values ?? {})[0];

      // if expression contains any dynamic operation such as value manipulation or nested attribute manipulation in a list
      if (
        !(parsedUpdate instanceof SetUpdate) ||
        parsedUpdate.expression.includes(' + ') ||
        parsedUpdate.expression.includes(' - ') ||
        nestedKeyAccessRegex.test(parsedUpdate.expression)
      ) {
        return {
          value: parsedValue,
          type: 'dynamic',
        };
      }

      // return static value
      return {
        type: 'static',
        value: parsedValue,
      };
    } else {
      // if tried to update nested value for key, it is considered dynamic, as we do not know full value of updating attribute
      if (nestedKeyAccessRegex.test(attr)) {
        return {
          type: 'dynamic',
          value,
        };
      }
      // return value as a default value
      return {type: 'static', value};
    }
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
    return Object.entries(options).map(([operatorOrAttr, value]): T => {
      // if top level key is one of the logical operators, rerun parse with it's values
      if (['AND', 'OR', 'NOT'].includes(operatorOrAttr)) {
        const parsedExpList = this.recursiveParseToBaseExpression<T>(
          value,
          ExpClass
        );
        const base = parsedExpList.shift();
        if (!base) {
          return new ExpClass();
        }
        switch (operatorOrAttr) {
          case 'AND': {
            if (!parsedExpList?.length) {
              return base;
            }
            return base.mergeMany(parsedExpList as T[], MERGE_STRATEGY.AND);
          }
          case 'OR': {
            if (!parsedExpList?.length) {
              return base;
            }
            return base.mergeMany(parsedExpList as T[], MERGE_STRATEGY.OR);
          }
          case 'NOT': {
            // not can not contain more than one items
            if (parsedExpList?.length) {
              throw new Error(
                `Value for operator "${operatorOrAttr}" can not contain more than 1 attributes.`
              );
            }
            return base.not();
          }
          default: {
            throw new Error(`Unsupported logical operator "${operatorOrAttr}"`);
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
    });
  }

  /**
   * Parses input to update expression
   * @param body body to parse
   */
  private parseToUpdateExpression(
    body: any,
    attrValueOverrideMap: Record<string, any>
  ) {
    return (
      Object.entries(body)
        .map(([attr, value]) => {
          if (isObject(value) && !isEmptyObject(value)) {
            const [operator, operatorValue] = Object.entries(
              value as any
            )[0] as [
              (
                | UpdateType.ArithmeticOperator
                | UpdateType.SetUpdateOperator
                | UpdateType.Action
              ),
              any
            ];

            return this.parseValueToUpdateExp(
              attr,
              value,
              operator,
              operatorValue,
              attrValueOverrideMap[attr] // get any override value if exists
            );
          } else {
            // fallback to default `SET` action based update
            return new SetUpdate().setTo(
              attr,
              attrValueOverrideMap[attr] || value
            );
          }
        })
        // merge all expressions with matching action
        .reduce(
          (acc, currExp) => {
            acc
              .find(instance => instance.constructor === currExp.constructor)!
              .merge(currExp);
            return acc;
          },
          [
            new SetUpdate(),
            new AddUpdate(),
            new RemoveUpdate(),
            new DeleteUpdate(),
          ]
        )
        // merge all expressions of different actions
        .reduce((acc, curr) => {
          acc.merge(curr);
          return acc;
        }, new Update())
    );
  }

  /**
   * Parses single attribute into update expression instance
   * @param attribute name/path of the attribute
   * @param attributeValue value to update
   */
  private parseValueToUpdateExp(
    attribute: string,
    attributeValue: any, // attribute value to set
    operator:
      | UpdateType.ArithmeticOperator
      | UpdateType.SetUpdateOperator
      | UpdateType.Action,
    operatorValue: any,
    staticValueToOverride?: any // value to override for attribute, this is set in cases where there was a custom property transform was requested
  ): Update {
    switch (operator) {
      case 'INCREMENT_BY':
      case 'DECREMENT_BY': {
        return new SetUpdate().setTo(attribute, operatorValue, operator);
      }
      case 'IF_NOT_EXISTS': {
        if (isSetOperatorComplexValueType(operatorValue)) {
          return new SetUpdate().setToIfNotExists(
            attribute,
            staticValueToOverride || operatorValue.$VALUE,
            operatorValue.$PATH
          );
        } else {
          return new SetUpdate().setToIfNotExists(attribute, operatorValue);
        }
      }
      case 'LIST_APPEND': {
        if (isSetOperatorComplexValueType(operatorValue)) {
          return new SetUpdate().setOrAppendToList(
            attribute,
            operatorValue.$VALUE,
            operatorValue.$PATH
          );
        } else {
          return new SetUpdate().setOrAppendToList(attribute, operatorValue);
        }
      }
      case 'SET': {
        /**
         * aliased set support, this allows access patterns like
         * {id: { SET: '1'}}
         * behaves similar to {id: '1'}
         */
        // handle explicit set exp
        if (isObject(operatorValue) && !isEmptyObject(operatorValue)) {
          const [nestedOperator, nestedOperatorValue] = Object.entries(
            operatorValue
          )[0] as [
            UpdateType.ArithmeticOperator | UpdateType.SetUpdateOperator,
            any
          ];

          return this.parseValueToUpdateExp(
            attribute,
            nestedOperatorValue,
            nestedOperator,
            nestedOperatorValue,
            staticValueToOverride
          );
        } else {
          // handle attribute with map type
          return new SetUpdate().setTo(
            attribute,
            staticValueToOverride || operatorValue
          );
        }
      }
      case 'ADD': {
        if (!(operatorValue instanceof Set) && isEmptyObject(operatorValue)) {
          throw new Error(
            `Invalid value ${operatorValue} received for action "ADD", Only numbers, sets and lists are supported.`
          );
        }
        return new AddUpdate().addTo(attribute, operatorValue);
      }
      case 'DELETE': {
        return new DeleteUpdate().delete(attribute, operatorValue);
      }
      case 'REMOVE': {
        if (typeof operatorValue === 'boolean' && !!operatorValue) {
          return new RemoveUpdate().remove(attribute);
        } else if (
          !isEmptyObject(operatorValue) &&
          Array.isArray(operatorValue.$AT_INDEX)
        ) {
          return new RemoveUpdate().remove(attribute, {
            atIndexes: operatorValue.$AT_INDEX,
          });
        } else {
          throw new Error(
            `Invalid value ${operatorValue} received for action "REMOVE". Value must be set to boolean
            In addition, You may use special value type {$AT_INDEX: Array<number>} for attribute of type list..`
          );
        }
      }
      default: {
        // handle attribute with map type
        return new SetUpdate().setTo(
          attribute,
          staticValueToOverride || attributeValue
        );
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
