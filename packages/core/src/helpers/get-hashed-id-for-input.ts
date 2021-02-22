import {validate, v5} from 'uuid';

/**
 * Generates unique id from SHA1 hashed data and given namespaceId
 * @param namespaceId unique namespace id to generate scoped id
 * @param dataToHash object to hash
 * @returns string
 *
 */
export function getHashedIdForInput(namespaceId: string, dataToHash: Object) {
  if (!validate(namespaceId)) {
    throw new Error('Workspace id must be an uuid');
  }

  const stringifiedData = JSON.stringify(dataToHash);
  return v5(stringifiedData, namespaceId);
}
