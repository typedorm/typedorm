import {Table} from '@typedorm/common';
import {isEmptyObject} from '../helpers/is-empty-object';
import {isObject} from '../helpers/is-object';
import {Condition} from './condition/condition';
import {KeyCondition} from './condition/key-condition';

export class ExpressionBuilder {
  /**
   * Higher level function to build unique record condition expression
   * @param table table to build unique record expression for
   */
  buildUniqueRecordConditionExpression(table: Table) {
    const uniqueRecordCondition = table.usesCompositeKey()
      ? new Condition()
          .attributeNotExist(table.partitionKey)
          .and()
          .attributeNotExist(table.sortKey)
      : new Condition().attributeNotExist(table.partitionKey);

    return this.buildConditionExpression(uniqueRecordCondition);
  }

  buildConditionExpression(condition: Condition) {
    if (!condition.expression) {
      return {ConditionExpression: ''};
    }
    const expression = {
      ConditionExpression: condition.expression.trim(),
      ExpressionAttributeNames: condition.names,
      ExpressionAttributeValues: condition.values,
    };
    return this.removeEmptyFieldsAndReturn(expression);
  }

  buildUpdateExpression(
    item: {[key: string]: any},
    options?: {
      nestedKeySeparator: string;
    }
  ) {
    if (!isObject(item)) {
      throw new Error('Item to generate expression must be of type object');
    }

    if (isEmptyObject(item)) {
      throw new Error(
        'Item to generate expression must contain at least one attribute'
      );
    }
    const nestedKeySeparator = options?.nestedKeySeparator || '.';

    // build update set expression
    const expression = Object.keys(item).reduce(
      (acc, key, index) => {
        // only append comma from second key
        if (index !== 0) {
          acc.UpdateExpression += ',';
        }

        let expAttrKey = '';

        if (key.includes(nestedKeySeparator)) {
          const pathParts = key.split(nestedKeySeparator);
          expAttrKey = pathParts
            .map((innerKey, innerIndex) => {
              const innerKeyExp = `#attr${index}_inner${innerIndex}`;
              acc.ExpressionAttributeNames[innerKeyExp] = innerKey;
              return innerKeyExp;
            })
            .join('.');
        } else {
          expAttrKey = `#attr${index}`;
          acc.ExpressionAttributeNames[expAttrKey] = key;
        }

        const expValKey = `:val${index}`;
        acc.UpdateExpression += ` ${expAttrKey} = ${expValKey}`;
        acc.ExpressionAttributeValues[expValKey] = item[key] ?? null;
        return acc;
      },
      {
        UpdateExpression: 'SET',
        ExpressionAttributeNames: {} as {[key: string]: string},
        ExpressionAttributeValues: {} as {[key: string]: any},
      }
    );
    return this.removeEmptyFieldsAndReturn(expression);
  }

  buildKeyConditionExpression(condition: KeyCondition) {
    if (!condition.expression) {
      return {};
    }

    const expression = {
      KeyConditionExpression: condition.expression.trim(),
      ExpressionAttributeNames: condition.names,
      ExpressionAttributeValues: condition.values,
    };
    return this.removeEmptyFieldsAndReturn(expression);
  }

  private removeEmptyFieldsAndReturn(expression: {
    ExpressionAttributeNames: any;
    ExpressionAttributeValues: any;
    [key: string]: any;
  }) {
    if (isEmptyObject(expression.ExpressionAttributeNames)) {
      delete expression.ExpressionAttributeNames;
    }

    if (isEmptyObject(expression.ExpressionAttributeValues)) {
      delete expression.ExpressionAttributeValues;
    }
    return expression;
  }
}
