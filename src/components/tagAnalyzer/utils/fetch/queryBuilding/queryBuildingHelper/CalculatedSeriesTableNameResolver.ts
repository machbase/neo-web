import { getUserName, isCurUserEqualAdmin } from '@/utils';

/**
 * Resolves the table name used by calculated fetches for non-admin users.
 * Intent: Qualify unscoped tables with the current user schema before building calculation queries.
 * @param {string} aTableName - The source table name from the fetch request.
 * @returns {string} The table name to use in the calculation query.
 */
export function resolveCalculatedSeriesTableName(aTableName: string): string {
    const sCurrentUserName = getUserName();

    if (isCurUserEqualAdmin()) {
        return aTableName;
    }

    if (aTableName.split('.').length === 1) {
        return `${sCurrentUserName}.${aTableName}`;
    }

    return aTableName;
}
