import {validate, v5} from 'uuid';

/**
 * Generates unique id from SHA1 hashed data and given namespaceId
 * @param namespaceId unique namespace id to generate scoped id
 * @param dataToHash object to hash
 * @returns string
 *
 */
export function getHashedIdForInput<T>(namespaceId: string, dataToHash: T) {
  if (!validate(namespaceId)) {
    throw new Error('Workspace id must be an uuid');
  }

  // since JSON.stringify doesn't guarantee order, we first sort them before creating hash of it
  const sortedObj = Object.keys(dataToHash)
    .sort()
    .reduce((acc: any, key) => {
      acc[key] = (dataToHash as any)[key];
      return acc;
    }, {} as T);

  // TODO: sort nested objects
  const stringifiedData = JSON.stringify(sortedObj);
  return v5(stringifiedData, namespaceId);
}
