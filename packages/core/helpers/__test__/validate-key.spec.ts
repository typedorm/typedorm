import { validateKey } from '../validate-key';

describe('validateKey()', () => {
  it('should validate key type', () => {
    expect(() =>
      validateKey('USER#{{id}}', {
        id: 'String',
      })
    ).not.toThrowError();
  });

  it('should validate string with multiple args', () => {
    expect(() =>
      validateKey('USER#{{id}}#STATUS#{{status}}', {
        id: 'String',
        status: 'String',
      })
    ).not.toThrowError();
  });

  it('should thrown an error when type of a key variable is non compatible', () => {
    expect(() =>
      validateKey('USER#{{id}}#STATUS#{{status}}', {
        id: 'String',
        status: 'Object',
      })
    ).toThrowError(
      '"status" is used in key USER#{{id}}#STATUS#{{status}}, thus it\'s type must be a "Number" or a "String"'
    );
  });
});
