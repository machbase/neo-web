/**
 * Which server table types a dashboard panel can read, and how each one behaves.
 *
 * The strings here are `getTableType()` output, not `M$SYS_TABLES.TYPE` numbers — every caller
 * already holds the converted name. Kept free of imports from `dashboardUtil` so that module can
 * import this one without a cycle.
 */

/** Types a panel block can be built on. TYPE 7 (view) and 8 (transaction) arrived with v8.7. */
export const DASHBOARD_TABLE_TYPES = ['tag', 'log', 'view', 'transaction'] as const;

/**
 * Types with no tag column of their own.
 *
 * This is not the same question as "does the block open expanded" — log opens expanded too, by way
 * of `DefaultLogTableOption.useCustom` and the disabled Fold button. What is specific to these two
 * is that the collapsed *semantics* have nothing to bind to:
 *   - a view inherits no TAGNAME flag from the tag table it was built on (measured: every column
 *     flag comes back 0), so there is no column that means "series name"
 *   - a transaction table has no `_<TABLE>_META`, so the tag picker cannot even list values —
 *     asking for `_DEMO_TRANSACTION_META` answers `MACHCLI-ERR-2025`
 *
 * log is deliberately absent, and folding it in would be a behaviour change rather than a tidy-up:
 * its `name` resolves to a real VARCHAR column, so a collapsed log block emits a working
 * `DEVICE in ('dev-a')`. Treating log as tagless would drop that filter from boards saved with a
 * collapsed log block and quietly widen what they chart. `type === 'log'` also selects the
 * `_ARRIVAL_TIME` and DURATION paths, which must not follow these two.
 */
export const TAGLESS_TABLE_TYPES = ['view', 'transaction'] as const;

const INTERNAL_TABLE_NAME_REGEX = /^_NEO_/i;

/**
 * A view's `_RID`, which `M$SYS_COLUMNS` reports but the engine refuses to select.
 *
 * Measured: `select _RID from FACTORY_A.SYS.DEMO_VIEW` answers `MACHCLI-ERR-2056, Column name
 * (_RID) not found`, while the same read against a log table succeeds. Since `_RID` is a LONG it
 * passes `isNumberTypeColumn`, so on a view whose only other columns are text and datetime it
 * becomes the default Value field and every query the panel builds fails.
 *
 * Matched exactly rather than by `^_`, for the same reason as above — `_`-leading column names are
 * legal and readable (measured: `CREATE TABLE ZZCHK2 (_ZZC integer, B integer)` then
 * `select _ZZC` succeeds).
 */
const VIEW_PHANTOM_COLUMNS = ['_RID'];

const normalizeType = (aTableType: unknown) => String(aTableType ?? '').trim().toLowerCase();

export const isDashboardTableType = (aTableType: unknown): boolean =>
    (DASHBOARD_TABLE_TYPES as readonly string[]).includes(normalizeType(aTableType));

export const isTaglessTableType = (aTableType: unknown): boolean => (TAGLESS_TABLE_TYPES as readonly string[]).includes(normalizeType(aTableType));

/**
 * Types that cannot be folded into collapsed (one-series-per-tag) mode.
 *
 * `vir_tag` and `variable_tag` are not server types — Block sets them for a `V$<TABLE>_STAT` block
 * and for one whose table name was typed or came from a `${variable}`. The stat view has no time
 * axis to collapse along; a typed name usually resolves to a tag table, so it stays foldable, which
 * is the behaviour that predates the v8.7 types.
 */
const NON_COLLAPSIBLE_TABLE_TYPES = ['log', 'view', 'transaction', 'vir_tag'];

export const isCollapsibleTableType = (aTableType: unknown): boolean => !NON_COLLAPSIBLE_TABLE_TYPES.includes(normalizeType(aTableType));

/**
 * The bare object name of a table-list row. Rows reach the panel filter before
 * `parseDashboardTables` qualifies them, so this is normally already bare — the split is here so
 * a qualified `database.owner.table` is judged on its last segment either way.
 */
const bareTableName = (aTableName: unknown) => String(aTableName ?? '').split('.').at(-1) ?? '';

export const isInternalDashboardTable = (aTableName: unknown): boolean => INTERNAL_TABLE_NAME_REGEX.test(bareTableName(aTableName));

/** Whether a table-list row belongs in a panel's Table dropdown. */
export const isDashboardSelectableTable = (aTableType: unknown, aTableName: unknown): boolean =>
    isDashboardTableType(aTableType) && !isInternalDashboardTable(aTableName);

/**
 * Columns to keep out of a block's field pickers for a given table type.
 *
 * tag hides every `_`-prefixed column (its `_META` bookkeeping), which is long-standing behaviour;
 * view hides only the phantom `_RID`; log hides nothing, because there `_ARRIVAL_TIME` is the
 * default time field and `_RID` genuinely reads.
 */
export const isHiddenColumnForTableType = (aTableType: unknown, aColumnName: unknown): boolean => {
    const sName = String(aColumnName ?? '');
    if (normalizeType(aTableType) === 'tag') return /^_.*/.test(sName);
    if (normalizeType(aTableType) === 'view') return VIEW_PHANTOM_COLUMNS.includes(sName.toUpperCase());
    return false;
};

/** `aColumns` filtered by {@link isHiddenColumnForTableType}. Rows are `[name, type, ...]`. */
export const visibleColumnsForTableType = (aTableType: unknown, aColumns: any[] = []): any[] =>
    aColumns.filter((aColumn: any) => !isHiddenColumnForTableType(aTableType, aColumn?.[0]));
