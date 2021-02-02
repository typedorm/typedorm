/**
 * Thrown when none of global or per entity table exists
 */
export class MissingRequiredTableConfig extends Error {
  name = 'MissingRequiredTableConfig';
  constructor(entityName: string) {
    super();
    this.message = `No table config could be resolved for entity "${entityName}", entity must have at least
    one of "connection table" or "entity table" configured.`;
  }
}
