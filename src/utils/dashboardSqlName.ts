import { sqlIdentifier, sqlIdentifierPath } from './queryText';

// A `{{name}}` board variable is replaced as text once the statement is built, and its value may be
// a whole `db.user.table` path, so a name carrying one is written exactly as the board holds it.
const DASHBOARD_VARIABLE = /\{\{.*?\}\}/;

/** A table a dashboard block reads, as SQL — `db.user.table` parts quoted where they need it. */
export const toSqlTableName = (aTableName: unknown): string => {
    const sTableName = String(aTableName ?? '');
    return DASHBOARD_VARIABLE.test(sTableName) ? sTableName : sqlIdentifierPath(sTableName);
};

/** A column a dashboard block reads, as SQL. An unset column stays empty rather than `""`. */
export const toSqlColumnName = (aColumn: unknown): string => {
    const sColumn = String(aColumn ?? '');
    return !sColumn || DASHBOARD_VARIABLE.test(sColumn) ? sColumn : sqlIdentifier(sColumn);
};
