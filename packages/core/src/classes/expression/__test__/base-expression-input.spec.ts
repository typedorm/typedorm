import {BaseExpressionInput, MERGE_STRATEGY} from '../base-expression-input';
import {Condition} from '../condition';

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

/**
 * @group addBaseOperator
 */
test('creates expression with arithmetic operands', () => {
  const condition = new TestCondition();
  condition.greaterThanAndEqualTo('balance', 0, {
    operand: 'SUB',
    value: 256,
  });

  expect(condition).toEqual({
    _names: {
      '#TC_balance': 'balance',
    },
    _values: {
      ':TC_balance': 0,
      ':TC_balance_SUB': 256,
    },
    expression: '#TC_balance - :TC_balance_SUB >= :TC_balance',
  });
});

test('creates expression with arithmetic operands', () => {
  const condition = new TestCondition();
  condition
    .greaterThanAndEqualTo('balance', 0, {
      operand: 'SUB',
      value: 256,
    })
    .merge(
      new TestCondition().lessThan('age', 3, {
        operand: 'MPY',
        value: 2,
      })
    );

  expect(condition).toEqual({
    _names: {
      '#TC_age': 'age',
      '#TC_balance': 'balance',
    },
    _values: {
      ':TC_age': 3,
      ':TC_age_MPY': 2,
      ':TC_balance': 0,
      ':TC_balance_SUB': 256,
    },
    expression:
      '(#TC_balance - :TC_balance_SUB >= :TC_balance) AND (#TC_age * :TC_age_MPY < :TC_age)',
  });
});

/**
 * @group merge
 */
test('merges conditions correctly', () => {
  const merged = new TestCondition()
    .lessThan('age', 12)
    .merge(new Condition().equals('name', 'sid'), MERGE_STRATEGY.AND);
  expect(merged).toEqual({
    _names: {
      '#CE_name': 'name',
      '#TC_age': 'age',
    },
    _values: {
      ':CE_name': 'sid',
      ':TC_age': 12,
    },
    expression: '(#TC_age < :TC_age) AND (#CE_name = :CE_name)',
  });
});

test('merges conditions when original contains no expression values', () => {
  const merged = new TestCondition().merge(
    new Condition().equals('name', 'sid'),
    MERGE_STRATEGY.AND
  );
  expect(merged).toEqual({
    _names: {
      '#CE_name': 'name',
    },
    _values: {
      ':CE_name': 'sid',
    },
    expression: '#CE_name = :CE_name',
  });
});

test('merges conditions when merging condition is empty', () => {
  const merged = new TestCondition()
    .equals('name', 'sid')
    .merge(new TestCondition(), MERGE_STRATEGY.OR);
  expect(merged).toEqual({
    _names: {
      '#TC_name': 'name',
    },
    _values: {
      ':TC_name': 'sid',
    },
    expression: '#TC_name = :TC_name',
  });
});

/**
 * @group mergeMany
 */

test('merges many conditions with AND operator', () => {
  const merged = new TestCondition()
    .lessThan('age', 12)
    .mergeMany(
      [
        new TestCondition().equals('name', 'sid'),
        new TestCondition().equals('status', 'active'),
        new TestCondition().greaterThan('score', 120),
      ],
      MERGE_STRATEGY.AND
    );
  expect(merged).toEqual({
    _names: {
      '#TC_age': 'age',
      '#TC_name': 'name',
      '#TC_score': 'score',
      '#TC_status': 'status',
    },
    _values: {
      ':TC_age': 12,
      ':TC_name': 'sid',
      ':TC_score': 120,
      ':TC_status': 'active',
    },
    expression:
      '(#TC_age < :TC_age) AND (#TC_name = :TC_name) AND (#TC_status = :TC_status) AND (#TC_score > :TC_score)',
  });
});

test('merges many conditions with OR operator', () => {
  const merged = new TestCondition()
    .lessThan('age', 12)
    .mergeMany(
      [
        new TestCondition().equals('name', 'sid'),
        new TestCondition().equals('status', 'active'),
        new TestCondition().greaterThan('score', 120),
      ],
      MERGE_STRATEGY.OR
    );
  expect(merged).toEqual({
    _names: {
      '#TC_age': 'age',
      '#TC_name': 'name',
      '#TC_score': 'score',
      '#TC_status': 'status',
    },
    _values: {
      ':TC_age': 12,
      ':TC_name': 'sid',
      ':TC_score': 120,
      ':TC_status': 'active',
    },
    expression:
      '(#TC_age < :TC_age) OR (#TC_name = :TC_name) OR (#TC_status = :TC_status) OR (#TC_score > :TC_score)',
  });
});

/**
 * not
 */
test('applies not logical condition', () => {
  const condition = new TestCondition().not(
    new TestCondition().equals('name', 'sue')
  );
  expect(condition).toEqual({
    _names: {
      '#TC_name': 'name',
    },
    _values: {
      ':TC_name': 'sue',
    },
    expression: 'NOT (#TC_name = :TC_name)',
  });
});

test('applies in operator condition', () => {
  const condition = new TestCondition().in('color', ['red', 'green']);
  expect(condition).toEqual({
    _names: {
      '#TC_color': 'color',
    },
    _values: {
      ':TC_color_0': 'red',
      ':TC_color_1': 'green',
    },
    expression: '#TC_color IN (:TC_color_0, :TC_color_1)',
  });
});

test('applies size operator condition', () => {
  const condition = new TestCondition().equals('games', 3).size('games');
  expect(condition).toEqual({
    _names: {
      '#TC_games': 'games',
    },
    _values: {
      ':TC_games': 3,
    },
    expression: 'size(#TC_games) = :TC_games',
  });
});
