/**
 * Converts a rollup interval unit into the SQL rollup unit token.
 * Intent: Keep SQL rollup rendering consistent regardless of caller casing or shorthand.
 * @param {string} intervalUnit - The incoming interval unit.
 * @returns {string} The normalized SQL rollup unit.
 */
export function normalizeRollupIntervalUnit(intervalUnit: string): string {
    switch (intervalUnit) {
        case 's':
        case 'sec':
        case 'second':
            return 'SEC';
        case 'm':
        case 'min':
        case 'minute':
            return 'MIN';
        case 'h':
        case 'hour':
            return 'HOUR';
        case 'd':
        case 'day':
            return 'DAY';
        default:
            return intervalUnit.toUpperCase();
    }
}

export function normalizeTruncatedIntervalUnit(intervalUnit: string): string {
    switch (intervalUnit) {
        case 's':
        case 'sec':
        case 'second':
            return 'sec';
        case 'm':
        case 'min':
        case 'minute':
            return 'min';
        case 'h':
        case 'hour':
            return 'hour';
        case 'd':
        case 'day':
            return 'day';
        case 'w':
        case 'week':
            return 'week';
        case 'M':
        case 'month':
            return 'month';
        case 'y':
        case 'year':
            return 'year';
        default:
            return intervalUnit.toLowerCase();
    }
}
