import {ExpressionInputParser} from '../expression-input-parser';
import {KeyCondition} from '../key-condition';

let expInputParser: ExpressionInputParser;
beforeEach(() => {
  expInputParser = new ExpressionInputParser();
});

test('parses keyCondition input', () => {
  const parsedCondition = expInputParser.parseToKeyCondition('SK', {
    BEGINS_WITH: 'USER#',
  });

  expect(parsedCondition).toBeInstanceOf(KeyCondition);
  expect(parsedCondition.expression).toEqual(
    'begins_with(#KY_CE_SK, :KY_CE_SK)'
  );
});
