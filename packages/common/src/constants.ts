/**
 * Current transaction write items limit set by dynamodb itself
 */
export const TRANSACTION_WRITE_ITEMS_LIMIT = 25;

/**
 * Prefix to apply to drm generated items
 */
export const DYNAMO_ATTRIBUTE_PREFIX = 'DRM_GEN';

/**
 * Default Limit that is applied when query conditions do not include any explicit limits
 */
export const DYNAMO_QUERY_ITEMS_IMPLICIT_LIMIT = 3000;
