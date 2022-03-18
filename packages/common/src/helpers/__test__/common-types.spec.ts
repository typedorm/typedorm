import {IsEntityInstance} from '../common-types';

describe('IsEntityInstance', () => {
  test('should return true when input is an instance of a class', () => {
    class Foo {}
    expect(IsEntityInstance(Foo)).toBe(true);
  });

  test('should return false when input is an object not constructed via a class', () => {
    expect(IsEntityInstance({name: 'foo'})).toBe(false);
  });

  test('should return true when input is an instance of a class named "Object" (dont do this!)', () => {
    // just in case anyone should be foolish enough to name a class "Object"...
    class Object {}
    expect(IsEntityInstance(Object)).toBe(true);
  });
});
