import { getUserName, isCurUserEqualAdmin } from '@/utils';

/**
 * Resolves a table name into its qualified form.
 * Intent: Ensure unqualified tables are routed through the admin schema expected by the fetch API.
 * @param {string} aTable - The table name to qualify.
 * @param {string} aAdminId - The admin schema prefix to apply when the table is unqualified.
 * @returns {string} The qualified table name.
 */
export function getQualifiedTableName(aTable: string, aAdminId: string): string {
    const sParts = aTable.split('.');
    if (sParts.length > 1) {
        return aTable;
    }

    return `${aAdminId.toUpperCase()}.${aTable}`;
}

/**
 * Resolves the table name used by calculated fetches for non-admin users.
 * Intent: Qualify unscoped tables with the current user schema before building calculation queries.
 * @param {string} aTableName - The source table name from the fetch request.
 * @returns {string} The table name to use in the calculation query.
 */
export function getCalculationTableName(aTableName: string): string {
    const sCurrentUserName = getUserName();

    if (isCurUserEqualAdmin()) {
        return aTableName;
    }

    if (aTableName.split('.').length === 1) {
        return `${sCurrentUserName}.${aTableName}`;
    }

    return aTableName;
}
