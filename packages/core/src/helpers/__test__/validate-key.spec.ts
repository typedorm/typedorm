import {NoSuchAttributeExistsError} from '@typedorm/common';
import {validateKey} from '../validate-key';

describe('validateKey()', () => {
  it('should validate key type', () => {
    expect(() =>
      validateKey('USER#{{id}}', {
        id: 'String',
      })
    ).not.toThrowError();
  });

  it('should validate key of type alias schema', () => {
    expect(() =>
      validateKey(
        {
          alias: 'name',
        },
        {
          id: 'String',
          name: 'Number',
        }
      )
    ).not.toThrowError();
  });

  it('should validate key of type alias schema and return appropriate error when referencing unknown attribute', () => {
    expect(() =>
      validateKey(
        {
          alias: 'someRandomAttribute',
        },
        {
          id: 'String',
          name: 'Number',
        }
      )
    ).toThrow(NoSuchAttributeExistsError);
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
      '"status" is used in key USER#{{id}}#STATUS#{{status}}, thus it\'s type must be or scalar type, if attribute type is Enum, please set "isEnum" to true in attribute decorator.'
    );
  });
});
