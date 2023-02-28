import {AUTO_GENERATE_ATTRIBUTE_STRATEGY} from '@typedorm/common';
import {autoGenerateValue} from '../auto-generate-attribute-value';

jest.mock('uuid', () => ({
  v4: () => 'c0ac5395-ba7c-41bf-bbc3-09a6087bcca2',
}));
jest.mock('ksuid', () => ({
  randomSync: () => ({
    string: '1irj9jenZH4PfTWp3NrDgpSF7lg',
  }),
}));

test('returns generated attribute value using uuid strategy', () => {
  const value = autoGenerateValue(AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4);
  expect(value).toEqual('c0ac5395-ba7c-41bf-bbc3-09a6087bcca2');
});

test('returns generated attribute value using ksuid strategy', () => {
  const value = autoGenerateValue(AUTO_GENERATE_ATTRIBUTE_STRATEGY.KSUID);
  expect(value).toEqual('1irj9jenZH4PfTWp3NrDgpSF7lg');
});

test('returns generated attribute value using epoch strategy', () => {
  jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

  const value = autoGenerateValue(AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH_DATE);
  expect(value).toEqual(1577836800);
});

test('returns generated attribute value using iso date strategy', () => {
  jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

  const value = autoGenerateValue(AUTO_GENERATE_ATTRIBUTE_STRATEGY.ISO_DATE);
  expect(value).toEqual('2020-01-01T00:00:00.000Z');
});

test('throws for unknown strategy', () => {
  const valueCreator = () => autoGenerateValue('INVALID' as any);

  expect(valueCreator)
    .toThrowError(`Unknown attribute value generation strategy provided: "INVALID".
    Valid attribute value generation strategies are: "UUID4", "KSUID", "EPOCH_DATE", "ISO_DATE"`);
});
