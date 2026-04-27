/**
 * Adds the admin schema to a table name when the name does not already include one.
 * Intent: Make fetch requests use the admin schema that the backend expects for bare table names.
 * @param {string} sourceTableName - The source table name.
 * @param {string} adminSchemaName - The admin schema to prepend when needed.
 * @returns {string} The table name with an admin schema when needed.
 */
export function addAdminSchemaIfNeeded(
    sourceTableName: string,
    adminSchemaName: string,
): string {
    const sParts = sourceTableName.split('.');
    if (sParts.length > 1) {
        return sourceTableName;
    }

    return `${adminSchemaName.toUpperCase()}.${sourceTableName}`;
}
