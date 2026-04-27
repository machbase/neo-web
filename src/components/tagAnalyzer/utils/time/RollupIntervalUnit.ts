/**
 * Normalizes an interval unit for rollup SQL syntax.
 * Intent: Keep rollup interval-unit normalization with the shared time helpers instead of inside SQL builders.
 * @param {string} intervalUnit - The interval unit to normalize.
 * @returns {string} The normalized rollup interval unit.
 */
export function normalizeRollupIntervalUnit(intervalUnit: string): string {
    switch (intervalUnit.toLowerCase()) {
        case 'sec':
            return 'SEC';
        case 'min':
            return 'MIN';
        case 'hour':
            return 'HOUR';
        case 'day':
            return 'DAY';
        default:
            return intervalUnit.toUpperCase();
    }
}
