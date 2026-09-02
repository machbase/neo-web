import { fetchQuery } from '@/api/repository/database';
import { getCurrentDatabaseId, getCurrentDatabaseName, hasLogicalDatabases } from '@/utils/currentDatabaseState';
import { SQL_BASE_LIMIT } from '@/utils/sqlFormatter';
import { buildTagStatExtentSelect, tagStatAxisColumns } from '@/utils/tagStatColumns';
import { parseDataViewerDistanceValue, type DataViewerBaseKind } from './dataViewerModel';

export interface DataViewerTableParams {
    dbName: string;
    userName: string;
    tableName: string;
}

export interface DataViewerTag {
    name: string;
    nodeId?: string;
    dataType?: string;
    asset?: Record<string, unknown>;
}

export interface DataViewerAssetHierarchy {
    column: string;
    schema: string[];
    tree?: unknown[];
}

export interface DataViewerTagList {
    tags: DataViewerTag[];
    assetHierarchy?: DataViewerAssetHierarchy;
}

export interface DataViewerResult {
    rows: Record<string, unknown>[];
    page: number;
    pageSize: number;
    total?: number;
}

export interface DataViewerTotalResult {
    total: number;
    pageSize: number;
    lastPage: number;
}

// One row of `listTableColumns`, in the projection order the SQL below fixes: NAME, TYPE, FLAG.
// The flag therefore sits at index 2 — `DATA_VIEWER_COLUMN_FLAG_INDEX` (dataViewerModel) is the
// reader's half of that contract and the two must move together. `src/utils/timeFieldColumns`
// defaults to index 4, which describes the DB Explorer's wider column row, not this one.
export type DataViewerColumnRow = [string, number, number];

const DEFAULT_TIME_COLUMN = 'TIME';
const DEFAULT_TAG_COLUMN = 'NAME';

// A range edge is only a real bound once it has been resolved to an absolute timestamp. The raw
// tokens the UI works in — 'last', 'now', 'last-1h', 'now-15m' — must never reach the SQL, or
// TO_TIMESTAMP would be handed a string it cannot parse.
const isUnresolvedRangeToken = (value: string) => value.startsWith('last') || value.startsWith('now');

const escapeSqlString = (value: string) => value.replace(/'/g, "''");
const normalizeIdentifier = (value: string | undefined, fallback: string) => {
    const next = value?.trim() || fallback;
    return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(next) ? next : fallback;
};
const formatMachbaseTimestamp = (value: string) => {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) return text;

    const parsed = Date.parse(text);
    if (!Number.isFinite(parsed)) return text;

    const date = new Date(parsed);
    const pad = (part: number, size = 2) => String(part).padStart(size, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

export const buildQualifiedTableName = ({ dbName, userName, tableName }: DataViewerTableParams) => `${dbName}.${userName}.${tableName}`;
export const buildQualifiedMetaTableName = ({ dbName, userName, tableName }: DataViewerTableParams) => `${dbName}.${userName}._${tableName}_META`;
// Machbase publishes per-tag statistics (ROW_COUNT, MIN_TIME, MAX_TIME, ...) in a view named after
// the tag table. Used to resolve time-range boundaries without scanning the table.
export const buildQualifiedTagStatViewName = ({ dbName, userName, tableName }: DataViewerTableParams) => `${dbName}.${userName}.V$${tableName}_STAT`;

const normalizeRows = (data: any): Record<string, unknown>[] => {
    const columns: string[] = data?.columns ?? [];
    const rows: unknown[][] = data?.rows ?? [];
    return rows.map((row: unknown[]) =>
        columns.reduce((acc: Record<string, unknown>, column: string, index: number) => {
            acc[column.toLowerCase()] = row[index];
            return acc;
        }, {})
    );
};

const normalizeChartSeriesRows = (data: any): unknown[][] => {
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
};

const pickDataTypeValue = (row: Record<string, unknown>) => {
    const dataType = row.data_type ?? row.datatype ?? row.type ?? row.dataType;
    return dataType === null || dataType === undefined ? undefined : String(dataType);
};

const parseJsonObject = (value: unknown): Record<string, unknown> | undefined => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string' || !value.trim().startsWith('{')) return undefined;

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
};

const normalizeAssetHierarchy = (row: Record<string, unknown>): DataViewerAssetHierarchy | undefined => {
    for (const value of Object.values(row)) {
        const parsed = parseJsonObject(value);
        if (!parsed) continue;
        const schema = Array.isArray(parsed.schema) ? parsed.schema.map((item) => String(item)).filter(Boolean) : [];
        const tree = Array.isArray(parsed.tree) ? parsed.tree : undefined;
        if (schema.length === 0 && !tree) continue;

        return {
            column: String(parsed.column || 'asset').toLowerCase(),
            schema,
            tree,
        };
    }

    return undefined;
};

// A distance bound reaches SQL as a bare numeric literal, never as text. `parseDataViewerDistanceValue`
// having already accepted it is what makes that safe: the only thing interpolated here is a JS number
// re-serialised by `String`, so there is no string for a quote to escape out of. An edge that does not
// parse yields `null` and the caller drops that bound entirely rather than passing the raw text
// through — the reason `escapeSqlString` is deliberately absent from this path.
const buildDistanceLiteral = (value: unknown) => {
    const numeric = parseDataViewerDistanceValue(value);
    return numeric === null ? null : String(numeric);
};

const buildTagDataWhere = ({
    names,
    from,
    to,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    baseKind = 'time',
}: {
    names: string[];
    from?: string | number;
    to?: string | number;
    tagColumn?: string;
    timeColumn?: string;
    baseKind?: DataViewerBaseKind;
}) => {
    const tagColumnExpr = normalizeIdentifier(tagColumn, 'NAME');
    const timeColumnExpr = normalizeIdentifier(timeColumn, 'TIME');
    const normalizedNames = (Array.isArray(names) ? names : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean);
    const where =
        normalizedNames.length > 1
            ? [`${tagColumnExpr} in (${normalizedNames.map((name) => `'${escapeSqlString(name)}'`).join(', ')})`]
            : [`${tagColumnExpr} = '${escapeSqlString(normalizedNames[0] || '')}'`];

    // A distance base column is a DOUBLE, not a DATETIME. `TO_TIMESTAMP` against it compares an
    // odometer reading to an epoch and matches nothing, so the whole time pipeline — the relative
    // `last`/`now` tokens included — is skipped in favour of a plain numeric comparison.
    if (baseKind === 'distance') {
        const fromLiteral = buildDistanceLiteral(from);
        const toLiteral = buildDistanceLiteral(to);
        if (fromLiteral !== null) where.push(`${timeColumnExpr} >= ${fromLiteral}`);
        if (toLiteral !== null) where.push(`${timeColumnExpr} <= ${toLiteral}`);
        return { tagColumnExpr, timeColumnExpr, where };
    }

    const fromText = from === undefined || from === null ? '' : String(from);
    const toText = to === undefined || to === null ? '' : String(to);
    if (fromText && !isUnresolvedRangeToken(fromText)) where.push(`${timeColumnExpr} >= TO_TIMESTAMP('${escapeSqlString(formatMachbaseTimestamp(fromText))}')`);
    if (toText && !isUnresolvedRangeToken(toText)) where.push(`${timeColumnExpr} <= TO_TIMESTAMP('${escapeSqlString(formatMachbaseTimestamp(toText))}')`);
    return { tagColumnExpr, timeColumnExpr, where };
};

// The cursor's base-column anchor, in whatever form the base column compares against.
// `null` means the anchor is unusable — on distance, a value that is not a number.
const buildCursorBaseSql = (value: string | number, baseKind: DataViewerBaseKind) => {
    if (baseKind === 'distance') return buildDistanceLiteral(value);
    return `TO_TIMESTAMP('${escapeSqlString(formatMachbaseTimestamp(String(value)))}')`;
};

const buildTagDataCursor = ({
    cursorSide,
    cursorTime,
    cursorName,
    direction,
    tagColumnExpr,
    timeColumnExpr,
    baseKind = 'time',
}: {
    cursorSide?: 'next' | 'prev';
    cursorTime?: string | number;
    cursorName?: string;
    direction: 'latest' | 'oldest';
    tagColumnExpr: string;
    timeColumnExpr: string;
    baseKind?: DataViewerBaseKind;
}) => {
    if ((cursorSide !== 'next' && cursorSide !== 'prev') || cursorTime === undefined || cursorTime === null || cursorTime === '') return undefined;

    const latest = direction !== 'oldest';
    const next = cursorSide === 'next';
    let timeOp: '<' | '>' = '<';
    let nameOp: '<' | '>' = '>';
    let orderTime: 'asc' | 'desc' = 'desc';
    let orderName: 'asc' | 'desc' = 'asc';
    let reverseRows = false;

    if (latest && next) {
        timeOp = '<';
        nameOp = '>';
        orderTime = 'desc';
        orderName = 'asc';
    } else if (latest) {
        timeOp = '>';
        nameOp = '<';
        orderTime = 'asc';
        orderName = 'desc';
        reverseRows = true;
    } else if (next) {
        timeOp = '>';
        nameOp = '>';
        orderTime = 'asc';
        orderName = 'asc';
    } else {
        timeOp = '<';
        nameOp = '<';
        orderTime = 'desc';
        orderName = 'desc';
        reverseRows = true;
    }

    const timeSql = buildCursorBaseSql(cursorTime, baseKind);
    // An anchor the base column cannot be compared against is no anchor. Returning `undefined` drops
    // the keyset predicate and the caller falls back to `limit offset, size` — a slower page move,
    // but the same rows. Emitting the unparsable value instead would either error out or, worse,
    // silently match nothing.
    if (timeSql === null) return undefined;
    const escapedName = escapeSqlString(cursorName || '');

    // The keyset stays a (base, name) pair on both axes: strictly past the anchor on the base column,
    // or level with it and past the anchor on the tag name. Only the literal changes.
    return {
        where: `(${timeColumnExpr} ${timeOp} ${timeSql} or (${timeColumnExpr} = ${timeSql} and ${tagColumnExpr} ${nameOp} '${escapedName}'))`,
        orderTime,
        orderName,
        reverseRows,
    };
};

export async function listTableTags(params: DataViewerTableParams & { tagColumn?: string }): Promise<DataViewerTagList> {
    const metaTable = buildQualifiedMetaTableName(params);
    const tagColumn = normalizeIdentifier(params.tagColumn, 'NAME');
    const { svrState, svrData, svrReason } = await fetchQuery(`select * from ${metaTable} where ${tagColumn} is not null order by _id asc limit 10000`);
    if (!svrState) throw new Error(svrReason || 'Failed to load tags');

    let assetHierarchy: DataViewerAssetHierarchy | undefined;
    const rows = normalizeRows(svrData);
    const tags = rows
        .map((row): DataViewerTag | null => {
            const name = String(row.name ?? row[tagColumn.toLowerCase()] ?? '').trim();
            if (!name) return null;
            if (name === '__machbase_hierarchy__') {
                assetHierarchy = normalizeAssetHierarchy(row);
                return null;
            }

            const assetColumn = assetHierarchy?.column ?? 'asset';
            return {
                name,
                nodeId: name,
                dataType: pickDataTypeValue(row),
                asset: parseJsonObject(row[assetColumn]),
            };
        })
        .filter((tag): tag is DataViewerTag => tag !== null);

    if (assetHierarchy) {
        const hierarchy = assetHierarchy;
        return {
            tags: tags.map((tag) => ({
                ...tag,
                asset: tag.asset ?? parseJsonObject(rows.find((row) => String(row.name ?? '').trim() === tag.name)?.[hierarchy.column]),
            })),
            assetHierarchy: hierarchy,
        };
    }

    return { tags };
}

// `DATABASE_ID = -1` is the local database (see api.ts's `case a.DATABASE_ID when -1 then
// 'MACHBASEDB'`); a mounted backup database has to be looked up by its mount name. Mirrors
// `resolveTableSchemaTarget` in tagAnalyzer/fetch/tableSchema/fetchTableSchema.ts.
const buildDatabaseIdExpression = (dbName: string) => {
    const name = String(dbName ?? '').trim();
    // The database this session is in needs no lookup — its id is already known. Only a name
    // that points somewhere else has to be resolved, through V$DATABASES on v8.7 and through
    // the mounted-backup catalogue on the older servers that had no logical databases.
    if (!name || name.toUpperCase() === getCurrentDatabaseName().toUpperCase()) return String(getCurrentDatabaseId());
    if (hasLogicalDatabases()) return `(select DATABASE_ID from V$DATABASES WHERE NAME = '${escapeSqlString(name)}')`;
    return `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = '${escapeSqlString(name)}')`;
};

/**
 * Column metadata for the table being viewed, as `[name, type, flag]` triples.
 *
 * `getTableInfo` (@/api/repository/api) answers the same question but is keyed by numeric database
 * and table IDs, and the Data Viewer only ever knows `dbName` / `userName` / `tableName` — the URL
 * entry point carries no IDs at all. So this asks M$SYS_COLUMNS directly, the same way every other
 * query in this module talks to the server.
 *
 * Never throws. The only caller uses this to decide whether the table's base axis is time or
 * distance, and a metadata read that failed must not take the grid down with it — an empty list
 * reads as "unknown", which the caller resolves to the plain time base it assumed before.
 */
export async function listTableColumns({ dbName, userName, tableName }: DataViewerTableParams): Promise<DataViewerColumnRow[]> {
    const sql = [
        'SELECT MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG',
        'FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU',
        'WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID',
        `AND MU.NAME = UPPER('${escapeSqlString(String(userName ?? ''))}')`,
        `AND MC.DATABASE_ID = ${buildDatabaseIdExpression(dbName)}`,
        `AND MT.NAME = '${escapeSqlString(String(tableName ?? ''))}'`,
        "AND MC.NAME <> '_RID'",
        'ORDER BY MC.ID',
    ].join(' ');

    try {
        const { svrState, svrData } = await fetchQuery(sql);
        if (!svrState) return [];
        const rows: unknown[][] = Array.isArray(svrData?.rows) ? svrData.rows : [];
        return rows
            .filter((row) => Array.isArray(row))
            .map((row): DataViewerColumnRow => [String(row[0] ?? ''), Number(row[1]), Number(row[2])])
            .filter((row) => row[0] !== '');
    } catch {
        return [];
    }
}

export async function queryTagData({
    dbName,
    userName,
    tableName,
    names,
    direction,
    from,
    to,
    page,
    pageSize = SQL_BASE_LIMIT,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    valueColumn = 'VALUE',
    baseKind = 'time',
    boundedRange,
    cursorSide,
    cursorTime,
    cursorName,
    cursorOffset,
}: DataViewerTableParams & {
    names: string[];
    direction: 'latest' | 'oldest';
    from?: string | number;
    to?: string | number;
    page: number;
    pageSize?: number;
    tagColumn?: string;
    timeColumn?: string;
    valueColumn?: string;
    baseKind?: DataViewerBaseKind;
    boundedRange?: boolean;
    cursorSide?: 'next' | 'prev';
    cursorTime?: string | number;
    cursorName?: string;
    cursorOffset?: number;
}): Promise<DataViewerResult> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const valueColumnExpr = normalizeIdentifier(valueColumn, 'VALUE');
    const { tagColumnExpr, timeColumnExpr, where } = buildTagDataWhere({ names, from, to, tagColumn, timeColumn, baseKind });
    const cursor = buildTagDataCursor({ cursorSide, cursorTime, cursorName, direction, tagColumnExpr, timeColumnExpr, baseKind });
    const queryWhere = cursor ? [...where, cursor.where] : where;
    const offset = cursor ? Math.max(0, Math.floor(cursorOffset || 0)) : boundedRange ? 0 : Math.max(0, page - 1) * pageSize;
    const orderTime = cursor?.orderTime ?? (direction === 'latest' ? 'desc' : 'asc');
    const orderName = cursor?.orderName ?? 'asc';
    const limitClause = cursor || !boundedRange ? ` limit ${offset}, ${pageSize}` : '';
    const sql = `select ${timeColumnExpr} as time, ${tagColumnExpr} as name, ${valueColumnExpr} as value from ${table} where ${queryWhere.join(' and ')} order by ${timeColumnExpr} ${orderTime}, ${tagColumnExpr} ${orderName}${limitClause}`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load data');

    const rows = normalizeRows(svrData);
    return {
        rows: cursor?.reverseRows ? [...rows].reverse() : rows,
        page,
        pageSize,
    };
}

export async function queryTagDataTotal({
    dbName,
    userName,
    tableName,
    names,
    from,
    to,
    pageSize = SQL_BASE_LIMIT,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    baseKind = 'time',
}: DataViewerTableParams & {
    names: string[];
    from?: string | number;
    to?: string | number;
    pageSize?: number;
    tagColumn?: string;
    timeColumn?: string;
    baseKind?: DataViewerBaseKind;
}): Promise<DataViewerTotalResult> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const { where } = buildTagDataWhere({ names, from, to, tagColumn, timeColumn, baseKind });
    const sql = `select count(*) as row_count from ${table} where ${where.join(' and ')}`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to calculate end page');

    const row = normalizeRows(svrData)[0] || {};
    const total = Number(row.row_count ?? row.count ?? Object.values(row)[0] ?? 0);
    const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
    const safePageSize = Math.max(1, Math.floor(pageSize));
    return {
        total: safeTotal,
        pageSize: safePageSize,
        lastPage: Math.max(1, Math.ceil(safeTotal / safePageSize)),
    };
}

export async function queryTagBoundaryTime({
    dbName,
    userName,
    tableName,
    names,
    direction,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
}: DataViewerTableParams & {
    names: string[];
    direction: 'latest' | 'oldest';
    tagColumn?: string;
    timeColumn?: string;
}): Promise<unknown> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const tagColumnExpr = normalizeIdentifier(tagColumn, 'NAME');
    const timeColumnExpr = normalizeIdentifier(timeColumn, 'TIME');
    const normalizedNames = (Array.isArray(names) ? names : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean);
    const tagCondition =
        normalizedNames.length > 1
            ? `${tagColumnExpr} in (${normalizedNames.map((name) => `'${escapeSqlString(name)}'`).join(', ')})`
            : `${tagColumnExpr} = '${escapeSqlString(normalizedNames[0] || '')}'`;
    const order = direction === 'latest' ? 'desc' : 'asc';

    // This is the one query that cannot carry a time predicate — it is what finds the boundary the
    // time window is built from. Scanning for it is brutal on a long-lived table: `ORDER BY TIME
    // DESC LIMIT 1` walks back from the table's newest record until it meets one of these tags,
    // which on a 63M-row tag whose data ends 13 months before the table's newest row measured
    // 4.53s. Machbase already keeps MIN_TIME / MAX_TIME per tag in the tag stat view, so ask for
    // the metadata instead — same value, measured 1.29ms.
    //
    // Only when the caller is asking about the default BASETIME column. MIN_TIME / MAX_TIME always
    // describe the table's BASETIME, so for any other time column the view would answer a question
    // we did not ask — and it would answer it *successfully*, which the fallback below cannot
    // detect. Skipping outright is the only way to keep that from becoming a silent wrong boundary.
    //
    // A distance base cannot reach here at all: this function's answer feeds `toDataViewerDate`,
    // which wants a time, and the page's distance path resolves its edges through
    // `queryTagBaseColumnBounds` without ever asking for a boundary *time*. If one did arrive, the
    // stat view would answer `MACHCLI-ERR-2056` — a distance table's view publishes MIN_DISTANCE /
    // MAX_DISTANCE and no MIN_TIME at all — and the fallback below would scan a column measuring
    // metres. Loud either way, which is why the guard is about the column, not the axis.
    //
    // Also requires the default tag column and a non-empty name list: the stat view keys its rows by
    // `NAME`, and `NAME in ()` is a syntax error the server rejects outright.
    if (timeColumnExpr === DEFAULT_TIME_COLUMN && tagColumnExpr === DEFAULT_TAG_COLUMN && normalizedNames.length > 0) {
        const statView = buildQualifiedTagStatViewName({ dbName, userName, tableName });
        const timeAxis = tagStatAxisColumns('time');
        const statColumn = direction === 'latest' ? `max(${timeAxis.max})` : `min(${timeAxis.min})`;
        const statSql = `select ${statColumn} as time from ${statView} where NAME in (${normalizedNames.map((name) => `'${escapeSqlString(name)}'`).join(', ')})`;
        const stat = await fetchQuery(statSql).catch(() => ({ svrState: false, svrData: undefined, svrReason: '' }));
        if (stat.svrState) {
            const statTime = normalizeRows(stat.svrData)[0]?.time;
            if (statTime !== null && statTime !== undefined && statTime !== '') return statTime;
        }
    }

    // Fallback: the stat view is missing, or the table uses a non-default BASETIME column whose
    // boundary the fixed MIN_TIME / MAX_TIME columns do not describe. Correctness over speed.
    const sql = `select ${timeColumnExpr} as time from ${table} where ${tagCondition} order by ${timeColumnExpr} ${order} limit 1`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load time range base');

    return normalizeRows(svrData)[0]?.time;
}

/**
 * The full extent of the base column across a set of tags — the distance range editor's slider
 * bounds. `{ min, max }`, or `null` when there is no usable extent.
 *
 * Two ways to answer it, in this order:
 *
 *  1. `V$<TABLE>_STAT`, whose MIN_DISTANCE / MAX_DISTANCE hold the BASETIME column's extent as
 *     metadata, in the column's own unit and its own type, with no rows read at all. `baseKind` has
 *     to say `distance` for this path to open, and that is not a formality: those columns exist only
 *     on a distance base. A time base publishes MIN_TIME / MAX_TIME instead, and asking it for
 *     MIN_DISTANCE is `MACHCLI-ERR-2056, Column name (MIN_DISTANCE) not found`.
 *  2. `min()`/`max()` over the column itself. Correct on any table, any column, any server, and the
 *     answer whenever the stat view is skipped, missing, keyed by a tag column it does not have, or
 *     rejects the query — which is also what a server too old to publish the distance columns does,
 *     so this path is the whole of that compatibility story.
 *
 * Both paths were run against MACHBASEDB.SYS.DISTANCE_SENSOR and agree exactly — 0 .. 999990 — for
 * one tag, three tags and all ten. What separates them is cost, and it is the tag filter that makes
 * the difference: unfiltered, `min/max` over the column is a metadata read too (198µs), but the
 * `where NAME in (...)` this function always carries turns it into a scan. Measured:
 *
 *     tags   stat view    column scan
 *        1      197µs         10.3ms
 *        2      259µs        333.0ms
 *        3      284µs         29.1ms
 *       10      1.46ms       156.5ms
 *
 * Every failure — a rejected query, an unreadable row, a degenerate extent — is `null` rather than a
 * throw. The editor treats that as "extent unknown" and keeps free numeric entry, so a bounds read
 * that goes wrong never stops the dialog opening.
 */
export async function queryTagBaseColumnBounds({
    dbName,
    userName,
    tableName,
    names,
    tagColumn = DEFAULT_TAG_COLUMN,
    baseColumn = DEFAULT_TIME_COLUMN,
    baseKind = 'time',
}: DataViewerTableParams & {
    names: string[];
    tagColumn?: string;
    baseColumn?: string;
    baseKind?: DataViewerBaseKind;
}): Promise<{ min: number; max: number } | null> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const tagColumnExpr = normalizeIdentifier(tagColumn, DEFAULT_TAG_COLUMN);
    const baseColumnExpr = normalizeIdentifier(baseColumn, DEFAULT_TIME_COLUMN);
    const normalizedNames = (Array.isArray(names) ? names : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean);
    // `NAME in ()` is a syntax error the server rejects outright, and an unfiltered aggregate would
    // describe tags the user is not looking at.
    if (normalizedNames.length === 0) return null;

    const nameList = normalizedNames.map((name) => `'${escapeSqlString(name)}'`).join(', ');
    const tagCondition = normalizedNames.length > 1 ? `${tagColumnExpr} in (${nameList})` : `${tagColumnExpr} = '${escapeSqlString(normalizedNames[0])}'`;

    // The stat view keys its rows by `NAME`, so a table with any other tag column is one it cannot be
    // asked about at all.
    if (baseKind === 'distance' && tagColumnExpr === DEFAULT_TAG_COLUMN) {
        const statView = buildQualifiedTagStatViewName({ dbName, userName, tableName });
        // Aggregated, not a bare pair of columns: the view answers one row per tag, and on a cluster
        // one row per warehouse per tag, and the extent is the aggregate over all of them.
        const statSql = `select ${buildTagStatExtentSelect('distance', 'mn', 'mx')} from ${statView} where NAME in (${nameList})`;
        const stat = await fetchQuery(statSql).catch(() => ({ svrState: false, svrData: undefined, svrReason: '' }));
        if (stat.svrState) {
            const statRow = normalizeRows(stat.svrData)[0] || {};
            // The same parser the column scan below uses, because the two now carry the same thing: a
            // number in the base column's unit. A LONG or ULONG base past 2^53 loses its low bits on
            // the way through JSON either way, so the two paths stay in agreement even there.
            const statMin = parseDataViewerDistanceValue(statRow.mn);
            const statMax = parseDataViewerDistanceValue(statRow.mx);
            if (statMin !== null && statMax !== null && statMax > statMin) return { min: statMin, max: statMax };
        }
    }

    const sql = `select min(${baseColumnExpr}) as mn, max(${baseColumnExpr}) as mx from ${table} where ${tagCondition}`;
    const { svrState, svrData } = await fetchQuery(sql).catch(() => ({ svrState: false, svrData: undefined, svrReason: '' }));
    if (!svrState) return null;

    const row = normalizeRows(svrData)[0] || {};
    const min = parseDataViewerDistanceValue(row.mn);
    const max = parseDataViewerDistanceValue(row.mx);
    // A single-valued column has no span to slide along, so it is reported as no extent at all
    // rather than as a zero-width slider whose thumbs cannot move.
    if (min === null || max === null || !(max > min)) return null;
    return { min, max };
}

function toEpochMs(value: unknown) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return Number.NaN;
        if (Math.abs(value) > 100000000000000) return value / 1000000;
        return value;
    }

    const text = String(value ?? '').trim();
    if (!text) return Number.NaN;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) return toEpochMs(numeric);
    return Date.parse(text);
}

export function buildSeriesFromChartRows(rows: unknown[][] = []) {
    const seriesByName = new Map<string, Array<[number, number | null]>>();

    rows.forEach((row) => {
        if (!Array.isArray(row) || row.length < 3) return;
        const x = toEpochMs(row[0]);
        const name = String(row[1] ?? '').trim();
        const y = row[2] === null || row[2] === '' ? null : Number(row[2]);
        if (!name || !Number.isFinite(x)) return;
        if (y !== null && !Number.isFinite(y)) return;
        if (!seriesByName.has(name)) seriesByName.set(name, []);
        seriesByName.get(name)?.push([x, y]);
    });

    return Array.from(seriesByName.entries()).map(([name, data]) => ({
        name,
        data: data.sort((a, b) => a[0] - b[0]),
    }));
}

export async function queryTagChartData({
    dbName,
    userName,
    tableName,
    names,
    from,
    to,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    valueColumn = 'VALUE',
    baseKind = 'time',
}: DataViewerTableParams & {
    names: string[];
    from?: string | number;
    to?: string | number;
    tagColumn?: string;
    timeColumn?: string;
    valueColumn?: string;
    baseKind?: DataViewerBaseKind;
}) {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const valueColumnExpr = normalizeIdentifier(valueColumn, 'VALUE');
    const { tagColumnExpr, timeColumnExpr, where } = buildTagDataWhere({ names, from, to, tagColumn, timeColumn, baseKind });
    const sql = `select ${timeColumnExpr} as time, ${tagColumnExpr} as name, ${valueColumnExpr} as value from ${table} where ${where.join(' and ')} order by ${timeColumnExpr} asc`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load chart data');
    const rows = normalizeChartSeriesRows(svrData);
    return {
        query: sql,
        rows,
        series: buildSeriesFromChartRows(rows),
    };
}
