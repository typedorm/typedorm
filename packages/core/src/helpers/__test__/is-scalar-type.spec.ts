import {isScalarType} from '../is-scalar-type';

test('checks if isScalarType return true for scalar values', () => {
  const scalarValues = ['string', 1, true, Buffer.from([0])];

  for (const scalarValue of scalarValues) {
    expect(isScalarType(scalarValue)).toBeTruthy();
  }
});

test('checks if isScalarType return true for "empty" scalar values', () => {
  const scalarValues = ['', 0, false, Buffer.from([])];

  for (const scalarValue of scalarValues) {
    expect(isScalarType(scalarValue)).toBeTruthy();
  }
});

test('checks if isScalarType return false for non-scalar types', () => {
  const nonScalarValues = [
    {},
    [],
    null,
    undefined,
    NaN,
    new Function(),
    new Map(),
  ];

  for (const nonScalarValue of nonScalarValues) {
    expect(isScalarType(nonScalarValue)).toBeFalsy();
  }
});
