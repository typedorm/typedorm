import {Table} from '@typedorm/common';
import {isEmptyObject} from '../../helpers/is-empty-object';
import {MERGE_STRATEGY} from './base-expression-input';
import {Condition} from './condition';
import {Filter} from './filter';
import {KeyCondition} from './key-condition';
import {Projection} from './projection';
import {Update} from './update/update';

export class ExpressionBuilder {
  andMergeConditionExpressions(
    existingExp: {
      ConditionExpression?: string;
      ExpressionAttributeNames?: any;
      ExpressionAttributeValues?: any;
    },
    newExp: {
      ConditionExpression?: string;
      ExpressionAttributeNames?: any;
      ExpressionAttributeValues?: any;
    }
  ) {
    if (existingExp.ConditionExpression && !newExp.ConditionExpression) {
      return this.removeEmptyFieldsAndReturn(existingExp);
    }

    if (newExp.ConditionExpression && !existingExp.ConditionExpression) {
      return this.removeEmptyFieldsAndReturn(newExp);
    }

    if (!newExp && !existingExp) {
      return {};
    }

    const mergedExp = {
      ConditionExpression: `(${existingExp.ConditionExpression}) AND (${newExp.ConditionExpression})`,
      ExpressionAttributeNames: {
        ...existingExp.ExpressionAttributeNames,
        ...newExp.ExpressionAttributeNames,
      },
      ExpressionAttributeValues: {
        ...existingExp.ExpressionAttributeValues,
        ...newExp.ExpressionAttributeValues,
      },
    };

    return this.removeEmptyFieldsAndReturn(mergedExp);
  }

  /**
   * Higher level function to build unique record condition expression
   * @param table table to build unique record expression for
   */
  buildUniqueRecordConditionExpression(table: Table) {
    const uniqueRecordCondition = table.usesCompositeKey()
      ? new Condition()
          .attributeNotExist(table.partitionKey)
          .merge(
            new Condition().attributeNotExist(table.sortKey),
            MERGE_STRATEGY.AND
          )
      : new Condition().attributeNotExist(table.partitionKey);

    const expression = this.buildConditionExpression(uniqueRecordCondition);
    return this.removeEmptyFieldsAndReturn(expression);
  }

  buildConditionExpression(condition: Condition): {
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, any>;
    ExpressionAttributeValues?: Record<string, any>;
  } {
    if (!condition.expression) {
      return {};
    }

    const expression = {
      ConditionExpression: condition.expression.trim(),
      ExpressionAttributeNames: condition.names,
      ExpressionAttributeValues: condition.values,
    };

    return this.removeEmptyFieldsAndReturn(expression);
  }

  buildProjectionExpression(projection: Projection): {
    ProjectionExpression?: string;
    ExpressionAttributeNames?: Record<string, any>;
  } {
    if (!projection.expression) {
      return {};
    }

    const expression = {
      ProjectionExpression: projection.expression.trim(),
      ExpressionAttributeNames: projection.names,
    };

    return this.removeEmptyFieldsAndReturn(expression);
  }

  buildUpdateExpression(update: Update) {
    if (!update.expression) {
      return {};
    }

    const expression = {
      UpdateExpression: update.expression.trim(),
      ExpressionAttributeNames: update.names,
      ExpressionAttributeValues: update.values,
    };
    return this.removeEmptyFieldsAndReturn(expression);
  }

  buildKeyConditionExpression(condition: KeyCondition): {
    KeyConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, any>;
    ExpressionAttributeValues?: Record<string, any>;
  } {
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

  buildFilterExpression(filter: Filter): {
    FilterExpression?: string;
    ExpressionAttributeNames?: Record<string, any>;
    ExpressionAttributeValues?: Record<string, any>;
  } {
    if (!filter.expression) {
      return {};
    }

    const expression = {
      FilterExpression: filter.expression.trim(),
      ExpressionAttributeNames: filter.names,
      ExpressionAttributeValues: filter.values,
    };
    return this.removeEmptyFieldsAndReturn(expression);
  }

  private removeEmptyFieldsAndReturn(expression: {
    ExpressionAttributeNames?: Record<string, any>;
    ExpressionAttributeValues?: Record<string, any>;
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
