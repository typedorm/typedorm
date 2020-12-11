import {parseKey} from '../parse-key';

describe('parseKey()', () => {
  it('should parse key and replace interpolation values with actual value', () => {
    const parsed = parseKey('USER#{{id}}', {
      id: '1111-2222',
    });

    expect(parsed).toEqual('USER#1111-2222');
  });

  it('should parse key with number', () => {
    const parsed = parseKey('USER#{{id}}', {
      id: 1111,
    });

    expect(parsed).toEqual('USER#1111');
  });

  it('should parse key multiple interpolation occurrences', () => {
    const parsed = parseKey('USER#{{id}}#CLASS#{{classId}}', {
      id: 1111,
      classId: 'class-1232',
    });

    expect(parsed).toEqual('USER#1111#CLASS#class-1232');
  });

  it('should thrown an error when no mapping found in dictionary', () => {
    expect(() => parseKey('USER#{{id}}', {})).toThrowError(
      'Could not resolve "id" from given dictionary'
    );
  });
});
