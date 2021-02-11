import {BaseExpressionInput, MERGE_STRATEGY} from '../base-expression-input';

class TestCondition extends BaseExpressionInput {
  protected getExpNameKey(key: string): string {
    return `#TC_${key}`;
  }
  protected getExpValueKey(key: string): string {
    return `:TC_${key}`;
  }
  constructor() {
    super();
  }
}

describe('BaseExpressionInput', () => {
  it('should correctly chain conditions', () => {
    const condition = new TestCondition()
      .equals('name', 'Boi')
      .merge(
        new TestCondition()
          .lessThan('age', 18)
          .or()
          .between('score', [12, 100]),
        MERGE_STRATEGY.AND
      );

    expect(condition).toEqual({
      expression:
        '(#TC_name = :TC_name) AND ((#TC_age < :TC_age) OR #TC_score BETWEEN :TC_score_start AND :TC_score_end)',
      _names: {
        '#TC_age': 'age',
        '#TC_name': 'name',
        '#TC_score': 'score',
      },
      _values: {
        ':TC_age': 18,
        ':TC_name': 'Boi',
        ':TC_score_end': 100,
        ':TC_score_start': 12,
      },
    });
  });
  describe('merge()', () => {
    it('should correctly merge multiple expressions with AND strategy', () => {
      const firstCondition = new TestCondition().equals('a', 1);
      const secondCondition = new TestCondition().equals('b', 2);
      const newCondition = firstCondition.merge(secondCondition);
      expect(newCondition).toEqual({
        expression: '(#TC_a = :TC_a) AND (#TC_b = :TC_b)',
        _names: {
          '#TC_a': 'a',
          '#TC_b': 'b',
        },
        _values: {
          ':TC_a': 1,
          ':TC_b': 2,
        },
      });
    });

    it('should correctly merge multiple expressions with OR strategy', () => {
      const firstCondition = new TestCondition().equals('a', 1);
      const secondCondition = new TestCondition().equals('b', 2);
      const newCondition = firstCondition.merge(
        secondCondition,
        MERGE_STRATEGY.OR
      );
      expect(newCondition).toEqual({
        expression: '(#TC_a = :TC_a) OR (#TC_b = :TC_b)',
        _names: {
          '#TC_a': 'a',
          '#TC_b': 'b',
        },
        _values: {
          ':TC_a': 1,
          ':TC_b': 2,
        },
      });
    });
  });

  describe('between()', () => {
    it('should correctly generate between expression', () => {
      const condition = new TestCondition().between('date', [
        'yesterday',
        'today',
      ]);
      expect(condition).toEqual({
        expression: '#TC_date BETWEEN :TC_date_start AND :TC_date_end',
        _names: {
          '#TC_date': 'date',
        },
        _values: {
          ':TC_date_end': 'today',
          ':TC_date_start': 'yesterday',
        },
      });
    });
  });

  describe('beginsWith()', () => {
    it('should correctly generate beginsWith expression', () => {
      const condition = new TestCondition().beginsWith('date', 'USER#');
      expect(condition).toEqual({
        expression: 'begins_with(#TC_date, :TC_date)',
        _names: {
          '#TC_date': 'date',
        },
        _values: {
          ':TC_date': 'USER#',
        },
      });
    });
  });

  describe('equals()', () => {
    it('should correctly generate equals expression', () => {
      const condition = new TestCondition().equals('date', '2018-10-22');
      expect(condition).toEqual({
        expression: '#TC_date = :TC_date',
        _names: {
          '#TC_date': 'date',
        },
        _values: {
          ':TC_date': '2018-10-22',
        },
      });
    });
  });
});
