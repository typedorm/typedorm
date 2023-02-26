import {IsEntityInstance} from '../common-types';

describe('IsEntityInstance', () => {
  test('should return true when input is an instance of a class', () => {
    class Foo {}
    expect(IsEntityInstance(Foo)).toBe(true);
  });

  test('should return false when input is an object not constructed via a class', () => {
    expect(IsEntityInstance({name: 'foo'})).toBe(false);
  });
});
