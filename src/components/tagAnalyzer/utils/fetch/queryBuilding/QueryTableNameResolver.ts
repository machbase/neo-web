/**
 * Resolves a table name into its qualified form.
 * Intent: Ensure unqualified tables are routed through the admin schema expected by the fetch API.
 * @param {string} aTable - The table name to qualify.
 * @param {string} aAdminId - The admin schema prefix to apply when the table is unqualified.
 * @returns {string} The qualified table name.
 */
export function getAdminQualifiedFetchTableName(aTable: string, aAdminId: string): string {
    const sParts = aTable.split('.');
    if (sParts.length > 1) {
        return aTable;
    }

    return `${aAdminId.toUpperCase()}.${aTable}`;
}
