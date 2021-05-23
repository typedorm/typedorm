export enum RETURN_VALUES {
  ALL_OLD = 'ALL_OLD',
  ALL_NEW = 'ALL_NEW',
  UPDATED_OLD = 'UPDATED_OLD',
  UPDATED_NEW = 'UPDATED_NEW',
  NONE = 'NONE',
}

export enum INDEX_TYPE {
  GSI = 'GLOBAL_SECONDARY_INDEX',
  LSI = 'LOCAL_SECONDARY_INDEX',
}

export enum QUERY_ORDER {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum AUTO_GENERATE_ATTRIBUTE_STRATEGY {
  /**
   * @summary Universally Unique Identifier version 4
   */
  UUID4 = 'UUID4',
  /**
   * @summary K-Sortable Unique Identifier
   */
  KSUID = 'KSUID',
  EPOCH_DATE = 'EPOCH_DATE',
  ISO_DATE = 'ISO_DATE',
}

export enum INTERNAL_ENTITY_ATTRIBUTE {
  ENTITY_NAME = '__en',
}

export enum CONSUMED_CAPACITY_TYPE {
  INDEXES = 'INDEXES',
  TOTAL = 'TOTAL',
  NONE = 'NONE',
}
