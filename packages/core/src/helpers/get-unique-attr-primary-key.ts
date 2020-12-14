import {DYNAMO_ATTRIBUTE_PREFIX, Table} from '@typedorm/common';
export function getUniqueAttributePrimaryKey(
  table: Table,
  entityName: string,
  attrName: string,
  attrValue: any,
  prefix?: string
) {
  const item = {} as any;
  // add prefix to drm generated item to avoid name collisions
  let uniqueKeyValuePrefix = `${DYNAMO_ATTRIBUTE_PREFIX}_${entityName.toUpperCase()}.${attrName.toUpperCase()}#`;
  if (prefix) {
    uniqueKeyValuePrefix = prefix;
  }
  const uniqueKeyValue = `${uniqueKeyValuePrefix}${attrValue}`;

  if (table.usesCompositeKey()) {
    item[table.partitionKey] = uniqueKeyValue;
    item[table.sortKey ?? ''] = uniqueKeyValue;
  } else {
    item[table.partitionKey] = uniqueKeyValue;
  }

  return item;
}
