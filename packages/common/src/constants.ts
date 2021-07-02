/**
 * Current transaction write items limit set by dynamodb
 */
export const TRANSACTION_WRITE_ITEMS_LIMIT = 25;

/**
 * Current transaction read items limit set by dynamodb
 */
export const TRANSACTION_READ_ITEMS_LIMIT = 25;

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
 * Current batch read items limit set by dynamodb
 */
export const BATCH_READ_ITEMS_LIMIT = 100;

/**
 * Concurrency limit to apply, when running batch requests in parallel
 * i.e by default 5 promises are run at once
 */
export const BATCH_WRITE_CONCURRENCY_LIMIT = 5;

/**
 * Concurrency limit to apply, when running parallel scan requests
 */
export const PARALLEL_SCAN_CONCURRENCY_LIMIT = 10;

/**
 * Max number of allowed attempts for batch write items
 */
export const BATCH_WRITE_MAX_ALLOWED_ATTEMPTS = 10;

/**
 * Max number of allowed attempts for batch write items
 */
export const BATCH_READ_MAX_ALLOWED_ATTEMPTS = 10;
