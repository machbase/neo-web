/**
 * Builds the rollup time expression used by fetch SQL queries.
 * Intent: Keep fetch query syntax local to the fetch query-building folder instead of shared UI utils.
 * @param aTimeColumn The source time column name.
 * @param aIntervalType The rollup interval unit.
 * @param aIntervalValue The rollup interval size.
 * @returns The rollup SQL time expression.
 */
export function buildRollupTimeExpression(
    aTimeColumn: string,
    aIntervalType: string,
    aIntervalValue: number,
): string {
    return `ROLLUP('${getRollupTimeUnit(aIntervalType)}', ${aIntervalValue}, ${aTimeColumn})`;
}

function getRollupTimeUnit(aIntervalType: string): string {
    switch (aIntervalType.toLowerCase()) {
        case 'sec':
            return 'SEC';
        case 'min':
            return 'MIN';
        case 'hour':
            return 'HOUR';
        case 'day':
            return 'DAY';
        default:
            return aIntervalType.toUpperCase();
    }
}
