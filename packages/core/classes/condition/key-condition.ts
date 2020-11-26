import {BaseCondition} from './base-condition';

export class KeyCondition extends BaseCondition {
  constructor() {
    super();
  }

  getExpNameKey(key: string): string {
    return `#KY_CE_${key}`;
  }
  getExpValueKey(key: string): string {
    return `:KY_CE_${key}`;
  }
}
