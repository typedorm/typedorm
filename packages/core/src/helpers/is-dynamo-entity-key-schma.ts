import {DynamoEntitySchemaPrimaryKey} from '../classes/metadata/entity-metadata';
export const isDynamoEntityKeySchema = (
  item: any
): item is DynamoEntitySchemaPrimaryKey =>
  !!(
    (item as DynamoEntitySchemaPrimaryKey).attributes &&
    (item as DynamoEntitySchemaPrimaryKey).metadata
  );
