import {DYNAMO_ATTRIBUTE_PREFIX, Table, PrimaryKey} from '@typedorm/common';
import {parseKey} from './parse-key';
export function getUniqueAttributePrimaryKey(
  table: Table,
  entityName: string,
  attrName: string,
  attrValue: any,
  primaryKey?: PrimaryKey
) {
  const item = {} as any;

  const uniqueKeyValue = `${DYNAMO_ATTRIBUTE_PREFIX}_${entityName.toUpperCase()}.${attrName.toUpperCase()}#${attrValue}`;

  if (table.usesCompositeKey()) {
    if (primaryKey) {
      item[table.partitionKey] = parseKey(primaryKey.partitionKey, {
        [attrName]: attrValue,
      });
      item[table.sortKey] = parseKey(primaryKey.partitionKey, {
        [attrName]: attrValue,
      });
    } else {
      item[table.partitionKey] = uniqueKeyValue;
      item[table.sortKey] = uniqueKeyValue;
    }
  } else {
    item[table.partitionKey] = uniqueKeyValue;
  }

  return item;
}
