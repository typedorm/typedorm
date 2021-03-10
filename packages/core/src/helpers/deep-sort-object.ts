import {isObject} from './is-object';

export function deepSortObject(item: Object) {
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
