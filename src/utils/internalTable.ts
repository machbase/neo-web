/**
 * neo's own bookkeeping tables, and how to recognise one.
 *
 * machbase-neo stores its own definitions in `MACHBASEDB.SYS._NEO_*`. Measured on a v8.7 server,
 * that family is seven tables — `_NEO_API_TOKEN`, `_NEO_BRIDGE_DEF`, `_NEO_SHELL_DEF`,
 * `_NEO_STATZ`, `_NEO_SUBSCRIBER_DEF`, `_NEO_TIMER_DEF`, `_NEO_X509_CERT` — every one of them
 * TYPE 8 (transaction) and FLAG 0. Nothing in the catalogue tells them apart from a table the user
 * created, which is why the DB Explorer's FLAG-based hidden-object filter never caught them and
 * the name is the only thing left to key on.
 *
 * This predicate carries **no exceptions**. `_NEO_STATZ` is charted by dashboard panels, but that
 * is the dashboard's own policy and it lives with the dashboard
 * (`INTERNAL_TABLE_NAME_EXCEPTIONS` in `dashboardTableKind.ts`). Folding the exception in here
 * would force every other caller — the tree, the backup picker — to undo it, which is a double
 * negative nobody reads correctly twice.
 */

/**
 * The bare object name of a table-list row.
 *
 * Rows reach some callers already bare and others as `database.owner.table` (see
 * `parseDashboardTables`), so the last segment is what gets judged either way.
 */
export const bareTableName = (aTableName: unknown): string => String(aTableName ?? '').split('.').at(-1) ?? '';

/**
 * Anchored to `_NEO_`, not to a bare leading underscore.
 *
 * `_`-leading names are legal and readable for user objects — measured:
 * `CREATE TABLE ZZCHK2 (_ZZC integer, B integer)` then `select _ZZC` both succeed — so `^_` would
 * hide tables their owner deliberately created.
 */
const INTERNAL_TABLE_NAME_REGEX = /^_NEO_/i;

/** Whether a table name belongs to neo itself rather than to the user. */
export const isNeoInternalTable = (aTableName: unknown): boolean => INTERNAL_TABLE_NAME_REGEX.test(bareTableName(aTableName));
