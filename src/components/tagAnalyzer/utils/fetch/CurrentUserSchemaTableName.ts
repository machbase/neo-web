import { getUserName, isCurUserEqualAdmin } from '@/utils';

/**
 * Adds the current user's schema to a bare table name when needed.
 * Intent: Make non-admin calculation SQL read from the current user's schema without changing admin or already-qualified names.
 * @param {string} tableName - The source table name from the fetch request.
 * @returns {string} The table name to use in the calculation SQL.
 */
export function addCurrentUserSchemaIfNeeded(tableName: string): string {
    const sCurrentUserName = getUserName();

    if (isCurUserEqualAdmin()) {
        return tableName;
    }

    if (tableName.split('.').length === 1) {
        return `${sCurrentUserName}.${tableName}`;
    }

    return tableName;
}
