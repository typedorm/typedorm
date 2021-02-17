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

/**
 * Current batch write items limit set by dynamodb
 */
export const BATCH_WRITE_ITEMS_LIMIT = 25;

/**
 * Concurrency limit to apply, when running batch requests in parallel
 * i.e by default 5 promises are run at once
 */
export const BATCH_WRITE_CONCURRENCY_LIMIT = 5;

/**
 * Max number of allowed attempts for batch write items
 */
export const BATCH_WRITE_MAX_ALLOWED_ATTEMPTS = 10;
