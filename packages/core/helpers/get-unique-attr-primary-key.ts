import {DYNAMO_ATTRIBUTE_PREFIX} from '@typedorm/common';
import {Table} from '@typedorm/common/table';
export function getUniqueAttributePrimaryKey(
  table: Table,
  entityName: string,
  attrName: string,
  attrValue: any
) {
  const item = {} as any;
  // add prefix to drm generated item to avoid name collisions

  const uniqueKeyValue = `${DYNAMO_ATTRIBUTE_PREFIX}_${entityName.toUpperCase()}.${attrName.toUpperCase()}#${attrValue}`;

  if (table.usesCompositeKey()) {
    item[table.partitionKey] = uniqueKeyValue;
    item[table.sortKey ?? ''] = uniqueKeyValue;
  } else {
    item[table.partitionKey] = uniqueKeyValue;
  }

  return item;
}
