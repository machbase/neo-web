/**
 * Checks whether a table name already includes a schema prefix.
 * Intent: Share the schema-qualified table check across fetch helpers.
 * @param {string} tableName - The table name to inspect.
 * @returns {boolean} True when the table name already includes a schema.
 */
export function hasQualifiedTableName(tableName: string): boolean {
    return tableName.split('.').length > 1;
}
