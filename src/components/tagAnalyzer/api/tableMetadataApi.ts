import request from '@/api/core';
import { ensureCurrentDatabase } from '@/api/repository/currentDatabase';
import { getCurrentDatabaseId, hasLogicalDatabases } from '@/utils/currentDatabaseState';
import { fetchDashboardJsonColumnSamples } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import { parseTables } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { extractJsonPathsFromSamples } from '@/utils/dashboardJsonValue';
import { parseFiniteNumber } from '../objectGuards';
import {
    parseSqlIdentifierPath,
    type RollupDefinition,
    type RollupTableMap,
} from '../seriesModel';
import {
    getUnknownErrorMessage,
    parseQueryResponse,
    requestSqlQuery,
    type QueryResponse,
} from './machbaseClient';
import {
    buildSqlStringLiteral,
    joinSqlLines,
} from './sql';

const ROLLUP_METADATA_REQUEST_FAILED_MESSAGE = 'Rollup metadata request failed.';
const MALFORMED_ROLLUP_METADATA_MESSAGE =
    'Rollup metadata response contained malformed rows.';
const ROLLUP_VERSION_STORAGE_KEY = 'V$ROLLUP_VER';
const TABLE_LIST_REQUEST_FAILED_MESSAGE = 'Failed to fetch table names.';
const MALFORMED_TABLE_LIST_MESSAGE =
    'Table list response contained malformed rows.';
const TABLE_COLUMNS_REQUEST_FAILED_MESSAGE = 'Table columns request failed.';
const MALFORMED_TABLE_COLUMNS_MESSAGE =
    'Table columns response contained malformed rows.';
const TAG_SEARCH_REQUEST_FAILED_MESSAGE =
    'Tag search response was unsuccessful.';
const MALFORMED_TAG_SEARCH_MESSAGE =
    'Tag search response contained malformed rows.';
const JSON_PATH_REQUEST_FAILED_MESSAGE =
    'Failed to fetch JSON column paths.';
const MALFORMED_JSON_PATH_MESSAGE =
    'JSON column response contained malformed rows.';

export type TableColumn = {
    name: string;
    type: number;
    flag: number;
};

type RollupMetadataRow = [
    userName: string,
    tableName: string,
    intervalMs: number,
    columnName: string,
    supportsFirstLast: boolean,
];

type RollupMetadataRequest = {
    rollupVersion: string | null;
    promise: Promise<RollupTableMap>;
};

type TableColumnsTarget = {
    databaseIdQuery: string;
    tableName: string;
    userName: string;
};

let rollupMetadataRequest: RollupMetadataRequest | undefined;

async function fetchRollupMetadata(): Promise<RollupTableMap> {
    const rollupVersion: string | null = getConfiguredRollupVersion();
    const existingRequest: RollupMetadataRequest | undefined =
        rollupMetadataRequest;
    if (existingRequest?.rollupVersion === rollupVersion) {
        return existingRequest.promise;
    }

    const requestPromise: Promise<RollupTableMap> =
        fetchRollupMetadataUncached(rollupVersion).catch((error) => {
            if (rollupMetadataRequest?.promise === requestPromise) {
                rollupMetadataRequest = undefined;
            }
            throw error;
        });
    rollupMetadataRequest = {
        rollupVersion,
        promise: requestPromise,
    };

    return requestPromise;
}

async function fetchTableNames(): Promise<string[]> {
    const response: QueryResponse = parseQueryResponse(
        await request({
            method: 'GET',
            url: '/api/tables',
        }),
        TABLE_LIST_REQUEST_FAILED_MESSAGE,
        MALFORMED_TABLE_LIST_MESSAGE,
    );
    if (!response.columns) {
        throw new Error(MALFORMED_TABLE_LIST_MESSAGE);
    }

    return parseTables({
        columns: response.columns,
        rows: response.rows,
    });
}

async function fetchTableColumns(tableName: string): Promise<TableColumn[]> {
    if (!tableName) return [];

    // resolveTableColumnsTarget reads the current database synchronously, so the probe has to
    // have settled before it runs — otherwise a short table name is scoped to the pre-v8.7 -1.
    await ensureCurrentDatabase();
    const sql: string = buildTableColumnsSql(
        resolveTableColumnsTarget(tableName),
    );
    const response: QueryResponse = parseQueryResponse(
        await requestSqlQuery(sql),
        TABLE_COLUMNS_REQUEST_FAILED_MESSAGE,
        MALFORMED_TABLE_COLUMNS_MESSAGE,
    );

    return parseTableColumns(response.rows);
}

async function fetchTags(
    tableName: string,
    tagColumnName: string,
    searchText: string,
    page: number,
    pageSize: number,
): Promise<{ tags: string[]; total: number }> {
    if (!tableName || !tagColumnName) {
        return { tags: [], total: 0 };
    }

    const metaTableNameParts: string[] = tableName.split('.');
    const metaTableBaseName: string = `_${metaTableNameParts.at(-1)}_META`;
    metaTableNameParts.pop();
    metaTableNameParts.push(metaTableBaseName);

    const qualifiedMetaTableName: string = parseSqlIdentifierPath(
        metaTableNameParts.join('.'),
        'SQL metadata table name',
    );
    const tagColumn: string = parseSqlIdentifierPath(
        tagColumnName,
        'SQL tag column',
    );
    const whereSql: string = searchText
        ? `WHERE ${tagColumn} LIKE ${buildSqlStringLiteral(`%${searchText}%`)}`
        : '';
    const safePageSize: number = Math.max(1, Math.floor(pageSize));
    const offset: number =
        (Math.max(1, Math.floor(page)) - 1) * safePageSize;
    const listSql: string = joinSqlLines([
        `SELECT ${tagColumn}`,
        `FROM ${qualifiedMetaTableName}`,
        whereSql,
        `ORDER BY ${tagColumn}`,
        `LIMIT ${offset}, ${safePageSize}`,
    ]);
    const totalSql: string = joinSqlLines([
        'SELECT COUNT(*)',
        `FROM ${qualifiedMetaTableName}`,
        whereSql,
    ]);
    const [response, totalResponse]: QueryResponse[] = await Promise.all(
        [listSql, totalSql].map(async (sql): Promise<QueryResponse> =>
            parseQueryResponse(
                await requestSqlQuery(sql),
                TAG_SEARCH_REQUEST_FAILED_MESSAGE,
                MALFORMED_TAG_SEARCH_MESSAGE,
            ),
        ),
    );

    return {
        tags: parseTagNames(response.rows),
        total: parseTagTotal(totalResponse.rows),
    };
}

async function fetchJsonColumnPaths(
    tableName: string,
    valueColumnName: string,
): Promise<string[]> {
    const response: QueryResponse = parseQueryResponse(
        await fetchDashboardJsonColumnSamples(tableName, valueColumnName),
        JSON_PATH_REQUEST_FAILED_MESSAGE,
        MALFORMED_JSON_PATH_MESSAGE,
    );

    return extractJsonPathsFromSamples(
        response.rows.map((row) =>
            Array.isArray(row) ? row[0] : undefined,
        ),
    );
}

export const tableMetadataApi = {
    fetchRollupMetadata,
    fetchTableNames,
    fetchTableColumns,
    fetchTags,
    fetchJsonColumnPaths,
};

function getConfiguredRollupVersion(): string | null {
    return typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(ROLLUP_VERSION_STORAGE_KEY);
}

async function fetchRollupMetadataUncached(
    rollupVersion: string | null,
): Promise<RollupTableMap> {
    // v8.7 gave `v$rollup` a DATABASE_NAME column, so the database a rollup belongs to can be
    // read straight off the row. The older shape had to reach into V$STORAGE_MOUNT_DATABASES,
    // which only ever names *mounted backups* — on v8.7 that join matches nothing for ordinary
    // tables and every root_table came back NULL, taking the whole rollup map with it.
    await ensureCurrentDatabase();
    let sql: string = hasLogicalDatabases()
        ? `SELECT t1.user_name AS user_name,
  t1.database_name || '.' || t1.root_table AS root_table,
  t1.interval_time AS interval_time, t1.column_name AS column_name, t1.ext_type AS ext_type
FROM (
  SELECT v.database_name, u.name AS user_name, root_table, interval_time, column_name, ext_type
  FROM v$rollup AS v, m$sys_users AS u
  WHERE v.user_id = u.user_id
  GROUP BY v.database_name, root_table, interval_time, user_name, column_name, ext_type
) AS t1
ORDER BY user_name, root_table ASC, interval_time DESC`
        : `SELECT t1.user_name AS user_name,
  CASE WHEN t1.database_id = -1 THEN 'MACHBASEDB' ELSE t2.MOUNTDB END || '.' || t1.root_table AS root_table,
  t1.interval_time AS interval_time, t1.column_name AS column_name, t1.ext_type AS ext_type
FROM (
  SELECT v.database_id, u.name AS user_name, root_table, interval_time, column_name, ext_type
  FROM v$rollup AS v, m$sys_users AS u
  WHERE v.user_id = u.user_id
  GROUP BY v.database_id, root_table, interval_time, user_name, column_name, ext_type
) AS t1 LEFT OUTER JOIN V$STORAGE_MOUNT_DATABASES AS t2 ON (t1.database_id = t2.BACKUP_TBSID)
ORDER BY user_name, root_table ASC, interval_time DESC`;

    if (rollupVersion === 'OLD') {
        sql = `SELECT u.name AS user_name, root_table, interval_time, column_name, ext_type
FROM v$rollup AS v, m$sys_users AS u
WHERE v.user_id = u.user_id
GROUP BY root_table, interval_time, user_name, column_name, ext_type
ORDER BY user_name, root_table ASC, interval_time DESC`;
    }

    const rawResponse: unknown = await requestSqlQuery(sql);
    let response: QueryResponse;

    try {
        response = parseQueryResponse(
            rawResponse,
            ROLLUP_METADATA_REQUEST_FAILED_MESSAGE,
            MALFORMED_ROLLUP_METADATA_MESSAGE,
        );
    } catch (error) {
        const message: string = getUnknownErrorMessage(
            error,
            ROLLUP_METADATA_REQUEST_FAILED_MESSAGE,
        );
        Toast.error(message);
        throw new Error(message);
    }

    const rollupMap: RollupTableMap = {};
    for (const row of response.rows) {
        const rollupRow: RollupMetadataRow | undefined =
            parseRollupMetadataRow(row);
        if (!rollupRow) {
            Toast.error(MALFORMED_ROLLUP_METADATA_MESSAGE);
            throw new Error(MALFORMED_ROLLUP_METADATA_MESSAGE);
        }

        const [
            userName,
            tableName,
            intervalMs,
            columnName,
            supportsFirstLast,
        ]: RollupMetadataRow = rollupRow;
        rollupMap[userName] ??= {};
        rollupMap[userName][tableName] ??= {};
        const definitions: RollupDefinition[] =
            (rollupMap[userName][tableName][columnName] ??= []);
        const existingDefinition: RollupDefinition | undefined =
            definitions.find(
                (definition) => definition.intervalMs === intervalMs,
            );
        if (existingDefinition) {
            existingDefinition.supportsFirstLast ||= supportsFirstLast;
        } else {
            definitions.push({ intervalMs, supportsFirstLast });
        }
    }

    return rollupMap;
}

function parseRollupMetadataRow(
    row: unknown,
): RollupMetadataRow | undefined {
    if (!Array.isArray(row) || row.length < 5) return undefined;

    const [
        userName,
        tableName,
        interval,
        columnName,
        extType,
    ]: unknown[] = row;
    const intervalMs: number | undefined = parseFiniteNumber(interval);
    const parsedExtType: number | undefined = parseFiniteNumber(extType);
    if (
        typeof userName !== 'string' ||
        typeof tableName !== 'string' ||
        typeof columnName !== 'string' ||
        intervalMs === undefined ||
        intervalMs <= 0 ||
        parsedExtType === undefined
    ) {
        return undefined;
    }

    return [
        userName,
        tableName,
        intervalMs,
        columnName,
        parsedExtType !== 0,
    ];
}

function resolveTableColumnsTarget(tableName: string): TableColumnsTarget {
    const tableParts: string[] = tableName.split('.');
    const hasUserName: boolean = tableParts.length >= 2;
    const userName: string = tableParts.length >= 3
        ? tableParts[1]
        : tableParts[0];
    return {
        // Three-part names carry their database in the first part. On v8.7 that is a logical
        // database, resolved through V$DATABASES; on older servers the only multi-database
        // concept was a mounted backup, so the lookup stays on V$STORAGE_MOUNT_DATABASES.
        // A shorter name means "the database this session is in", which is -1 only pre-v8.7.
        databaseIdQuery: tableParts.length >= 3
            ? hasLogicalDatabases()
                ? `(SELECT DATABASE_ID FROM V$DATABASES WHERE NAME = ${buildSqlStringLiteral(tableParts[0])})`
                : `(SELECT BACKUP_TBSID FROM V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = ${buildSqlStringLiteral(tableParts[0])})`
            : String(getCurrentDatabaseId()),
        tableName: parseSqlIdentifierPath(
            tableParts.at(-1) ?? '',
            'SQL table name',
        ),
        userName: hasUserName
            ? parseSqlIdentifierPath(userName, 'SQL user name')
            : ADMIN_ID.toUpperCase(),
    };
}

function buildTableColumnsSql(target: TableColumnsTarget): string {
    return joinSqlLines([
        'SELECT SYSTEM_COLUMNS.NAME,',
        '       SYSTEM_COLUMNS.TYPE,',
        '       SYSTEM_COLUMNS.FLAG',
        'FROM M$SYS_TABLES SYSTEM_TABLES,',
        '     M$SYS_COLUMNS SYSTEM_COLUMNS,',
        '     M$SYS_USERS SYSTEM_USERS',
        'WHERE SYSTEM_TABLES.DATABASE_ID = SYSTEM_COLUMNS.DATABASE_ID',
        '  AND SYSTEM_TABLES.ID = SYSTEM_COLUMNS.TABLE_ID',
        '  AND SYSTEM_TABLES.USER_ID = SYSTEM_USERS.USER_ID',
        `  AND SYSTEM_USERS.NAME = UPPER(${buildSqlStringLiteral(target.userName)})`,
        `  AND SYSTEM_COLUMNS.DATABASE_ID = ${target.databaseIdQuery}`,
        `  AND SYSTEM_TABLES.NAME = ${buildSqlStringLiteral(target.tableName)}`,
        "  AND SYSTEM_COLUMNS.NAME <> '_RID'",
        'ORDER BY SYSTEM_COLUMNS.ID',
    ]);
}

function parseTableColumns(rows: unknown[]): TableColumn[] {
    const columns: TableColumn[] = [];

    for (const row of rows) {
        if (
            Array.isArray(row) &&
            typeof row[0] === 'string' &&
            Number.isFinite(Number(row[1]))
        ) {
            columns.push({
                name: row[0],
                type: Number(row[1]),
                flag: Number(row[2] ?? 0),
            });
        }
    }

    return columns;
}

function parseTagNames(rows: unknown[]): string[] {
    const tags: string[] = [];

    for (const row of rows) {
        if (
            Array.isArray(row) &&
            (typeof row[0] === 'string' || typeof row[0] === 'number')
        ) {
            tags.push(String(row[0]));
        }
    }

    return tags;
}

function parseTagTotal(rows: unknown[]): number {
    const firstRow: unknown = rows[0];
    if (!Array.isArray(firstRow)) return 0;

    const total: number = Number(firstRow[0]);
    return Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
}
