export const FMG_TIMING = {
    AD_BLOCK_CHECK_INTERVAL: 2000,
    STORAGE_SAVE_DEBOUNCE: 500,
    MAP_DATA_LOAD_TIMEOUT: 5000,
    MAP_MANAGER_LOAD_TIMEOUT: 60000,
    GLOBAL_WAIT_TIMEOUT: 10000,
    ELEMENT_WAIT_TIMEOUT: 5000
};

export const FMG_SYNC = {
    // Rate limit thresholds
    RATE_LIMIT_WARNING_THRESHOLD: 100,
    RATE_LIMIT_CRITICAL_THRESHOLD: 20,

    // Conflict detection threshold (5 minutes in milliseconds)
    CONFLICT_TIME_THRESHOLD_MS: 5 * 60 * 1000,

    // Retry delays for rate limiting (in milliseconds)
    RETRY_DELAY_MS: 1000
};
