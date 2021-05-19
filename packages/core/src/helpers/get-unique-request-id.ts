import {v4} from 'uuid';

export function getUniqueRequestId(requestId?: string) {
  return requestId || v4();
}
