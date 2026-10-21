import { sqlIdentifier, sqlIdentifierPath } from './queryText';
import { findColumnByName } from './timeFieldColumns';

// A `{{name}}` board variable is replaced as text once the statement is built, and its value may be
// a whole `db.user.table` path, so a name carrying one is written exactly as the board holds it.
const DASHBOARD_VARIABLE = /\{\{.*?\}\}/;

/** A table a dashboard block reads, as SQL — `db.user.table` parts quoted where they need it. */
export const toSqlTableName = (aTableName: unknown): string => {
    const sTableName = String(aTableName ?? '');
    return DASHBOARD_VARIABLE.test(sTableName) ? sTableName : sqlIdentifierPath(sTableName);
};

/**
 * A column a dashboard block reads, as SQL. An unset column stays empty rather than `""`.
 * Given the block's columns (`tableInfo`), a value that is none of them is an expression typed into
 * the Value field (`VALUE*2`, `abs(VALUE)`) and is written as typed: quoting it would read the whole
 * expression as one column name (#1558).
 */
export const toSqlColumnName = (aColumn: unknown, aColumns?: any[]): string => {
    const sColumn = String(aColumn ?? '');
    if (!sColumn || DASHBOARD_VARIABLE.test(sColumn)) return sColumn;
    if (aColumns?.length && !findColumnByName(aColumns, sColumn)) return sColumn;
    return sqlIdentifier(sColumn);
};
