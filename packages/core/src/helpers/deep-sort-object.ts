import {isObject} from '@typedorm/common';

export function deepSortObject(item: object) {
  if (!isObject(item)) {
    throw new Error('Only objects can be sorted with this method');
  }
  return recursiveSortObject(item);
}

function recursiveSortObject(item: any) {
  return Object.entries(item)
    .sort()
    .reduce((acc: any, [key, value]) => {
      if (isObject(value)) {
        acc[key] = recursiveSortObject(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
}
