import request from '@/api/core';
import { fetchDashboardJsonColumnSamples } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import { parseTables } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { extractJsonPathsFromSamples } from '@/utils/dashboardJsonValue';
import {
    createTagAnalyzerColumnInfo,
    type TagAnalyzerColumnInfo,
} from '@/utils/tagAnalyzerFields';
import type { RawTableListData } from '../metadata/MetadataFetchTypes';

const SQL_IDENTIFIER_SEGMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const TAG_SEARCH_LIMIT = 10;
const TABLE_METADATA_BATCH_SIZE = 50;

export type TableInfoSearchTagSearchItem = {
    id: string;
    name: string;
};

export type TableInfoSearchColumnMetadataRow =
    | [name: string, type: number, ...rest: unknown[]]
    | string[];

function buildSqlIdentifierPath(identifierPath: string, label = 'SQL identifier'): string {
    const sSegments = identifierPath.split('.');

    if (
        sSegments.length === 0 ||
        sSegments.some((segment) => !SQL_IDENTIFIER_SEGMENT_PATTERN.test(segment))
    ) {
        throw new Error(`${label} contains unsupported characters: ${identifierPath}`);
    }

    return identifierPath;
}

function buildSqlStringLiteral(value: string | number): string {
    return `'${String(value).replace(/'/g, "''")}'`;
}

type TableInfoSearchTagSearchParams = {
    table: string;
    searchText: string;
    columns: TagAnalyzerColumnInfo | undefined;
};

type TableInfoSearchTagSearchResult = {
    items: TableInfoSearchTagSearchItem[];
    errorMessage: string | undefined;
};

export type TableInfoSearchTableMetadataResult = {
    columns: TagAnalyzerColumnInfo | undefined;
    tableColumns: TableInfoSearchColumnMetadataRow[];
    errorMessage: string | undefined;
};

type TableMetadataTarget = {
    databaseIdQuery: string;
    tableName: string;
    userName: string;
};

type TableMetadataBatchTarget = {
    table: string;
    target: TableMetadataTarget;
};

type QueryResponse = {
    success?: unknown;
    data?: unknown;
    status?: unknown;
    statusText?: unknown;
    message?: unknown;
    reason?: unknown;
};

function asQueryResponse(rawResponse: unknown): QueryResponse | undefined {
    return typeof rawResponse === 'object' && rawResponse !== null
        ? (rawResponse as QueryResponse)
        : undefined;
}

function extractQueryRows(data: unknown): unknown[] {
    return typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { rows?: unknown }).rows)
        ? (data as { rows: unknown[] }).rows
        : [];
}

function extractQueryErrorMessage(
    response: QueryResponse | undefined,
    hasHttpError: boolean,
): string | undefined {
    if (response?.reason !== undefined) {
        return String(response.reason);
    }
    if (response?.message !== undefined) {
        return String(response.message);
    }
    if (typeof response?.data === 'string' && response.data.length > 0) {
        return response.data;
    }
    if (hasHttpError && typeof response?.statusText === 'string') {
        return response.statusText;
    }
    return undefined;
}

function parseTagSearchItems(rows: unknown[]): TableInfoSearchTagSearchItem[] {
    const sItems: TableInfoSearchTagSearchItem[] = [];

    for (const sRow of rows) {
        if (
            Array.isArray(sRow) &&
            (typeof sRow[0] === 'string' || typeof sRow[0] === 'number') &&
            typeof sRow[1] === 'string'
        ) {
            sItems.push({ id: String(sRow[0]), name: sRow[1] });
        }
    }

    return sItems;
}

export async function fetchTableInfoSearchTableNames(): Promise<string[]> {
    const sRawResponse = await request({
        method: 'GET',
        url: '/api/tables',
    });
    const { status, success, data } = asQueryResponse(sRawResponse) ?? {};

    if (success === false) {
        return [];
    }

    if (typeof status === 'number' && status >= 400) {
        return [];
    }

    return parseTables(data as RawTableListData);
}

export async function fetchTableInfoSearchTableMetadata(
    table: string,
    currentColumns?: Partial<TagAnalyzerColumnInfo>,
): Promise<TableInfoSearchTableMetadataResult> {
    if (!table) {
        return {
            columns: undefined,
            tableColumns: [],
            errorMessage: undefined,
        };
    }

    const sSql = buildTableMetadataSql(resolveTableMetadataTarget(table));
    const sRawResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSql)}`,
    });
    const sResponse = asQueryResponse(sRawResponse);
    const sHasHttpError = typeof sResponse?.status === 'number' && sResponse.status >= 400;
    const sErrorMessage = extractQueryErrorMessage(sResponse, sHasHttpError);

    if (sHasHttpError) {
        Toast.error(sErrorMessage ?? `Request failed (${sResponse?.status})`);
    }

    if (sResponse?.success !== true || sHasHttpError) {
        return {
            columns: undefined,
            tableColumns: [],
            errorMessage: sErrorMessage ?? '',
        };
    }

    const sTableColumns = parseTableColumnMetadataRows(
        extractQueryRows(sResponse.data),
    );

    return {
        columns: buildSourceColumns(sTableColumns, currentColumns),
        tableColumns: sTableColumns,
        errorMessage: undefined,
    };
}

export async function fetchTableInfoSearchTableMetadataBatch(
    tables: string[],
): Promise<Record<string, TableInfoSearchTableMetadataResult>> {
    const sMetadataByTable: Record<string, TableInfoSearchTableMetadataResult> = {};
    const sUniqueTables = Array.from(new Set(tables.filter(Boolean)));

    for (let i = 0; i < sUniqueTables.length; i += TABLE_METADATA_BATCH_SIZE) {
        const sTableBatch = sUniqueTables.slice(i, i + TABLE_METADATA_BATCH_SIZE);
        const sBatchResult = await fetchTableInfoSearchTableMetadataBatchChunk(
            sTableBatch,
        );

        Object.assign(sMetadataByTable, sBatchResult);
    }

    return sMetadataByTable;
}

async function fetchTableInfoSearchTableMetadataBatchChunk(
    tables: string[],
): Promise<Record<string, TableInfoSearchTableMetadataResult>> {
    if (tables.length === 0) {
        return {};
    }

    const sTargets = tables.map((table) => ({
        table,
        target: resolveTableMetadataTarget(table),
    }));
    const sSql = buildTableMetadataBatchSql(sTargets);
    const sRawResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSql)}`,
    });
    const sResponse = asQueryResponse(sRawResponse);
    const sHasHttpError =
        typeof sResponse?.status === 'number' && sResponse.status >= 400;

    if (sResponse?.success !== true || sHasHttpError) {
        return {};
    }

    return parseTableMetadataBatchRows(extractQueryRows(sResponse.data));
}

function resolveTableMetadataTarget(table: string): TableMetadataTarget {
    const sTableParts = table.split('.');

    if (sTableParts.length >= 3) {
        return {
            databaseIdQuery: `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = ${buildSqlStringLiteral(sTableParts[0])})`,
            tableName: buildSqlIdentifierPath(sTableParts.at(-1) ?? '', 'SQL table name'),
            userName: buildSqlIdentifierPath(sTableParts[1], 'SQL user name'),
        };
    }

    if (sTableParts.length === 2) {
        return {
            databaseIdQuery: String(-1),
            tableName: buildSqlIdentifierPath(sTableParts[1], 'SQL table name'),
            userName: buildSqlIdentifierPath(sTableParts[0], 'SQL user name'),
        };
    }

    return {
        databaseIdQuery: String(-1),
        tableName: buildSqlIdentifierPath(table, 'SQL table name'),
        userName: ADMIN_ID.toUpperCase(),
    };
}

function buildTableMetadataSql(target: TableMetadataTarget): string {
    return `SELECT MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER(${buildSqlStringLiteral(target.userName)}) AND MC.DATABASE_ID = ${target.databaseIdQuery} AND MT.NAME = ${buildSqlStringLiteral(target.tableName)} AND MC.NAME <> '_RID' ORDER BY MC.ID`;
}

function buildTableMetadataBatchSql(targets: TableMetadataBatchTarget[]): string {
    const sCaseBranches = targets
        .map(({ table, target }) => (
            `WHEN ${buildTableMetadataTargetCondition(target)} THEN ${buildSqlStringLiteral(table)}`
        ))
        .join(' ');
    const sTargetConditions = targets
        .map(({ target }) => `(${buildTableMetadataTargetCondition(target)})`)
        .join(' OR ');

    return `SELECT CASE ${sCaseBranches} END AS TABLE_KEY, MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MC.NAME <> '_RID' AND (${sTargetConditions}) ORDER BY TABLE_KEY, MC.ID`;
}

function buildTableMetadataTargetCondition(target: TableMetadataTarget): string {
    return `MU.NAME = UPPER(${buildSqlStringLiteral(target.userName)}) AND MC.DATABASE_ID = ${target.databaseIdQuery} AND MT.NAME = ${buildSqlStringLiteral(target.tableName)}`;
}

function parseTableColumnMetadataRows(rows: unknown[]): TableInfoSearchColumnMetadataRow[] {
    const sTableColumns: TableInfoSearchColumnMetadataRow[] = [];

    for (const sRow of rows) {
        if (Array.isArray(sRow) && typeof sRow[0] === 'string') {
            sTableColumns.push(sRow.slice(0, 3) as TableInfoSearchColumnMetadataRow);
        }
    }

    return sTableColumns;
}

function parseTableMetadataBatchRows(
    rows: unknown[],
): Record<string, TableInfoSearchTableMetadataResult> {
    const sTableColumnsByTable: Record<string, TableInfoSearchColumnMetadataRow[]> = {};

    for (const sRow of rows) {
        if (
            !Array.isArray(sRow) ||
            typeof sRow[0] !== 'string' ||
            typeof sRow[1] !== 'string'
        ) {
            continue;
        }

        const sTable = sRow[0];
        const sTableColumns = sTableColumnsByTable[sTable] ?? [];
        sTableColumns.push(sRow.slice(1, 4) as TableInfoSearchColumnMetadataRow);
        sTableColumnsByTable[sTable] = sTableColumns;
    }

    return Object.fromEntries(
        Object.entries(sTableColumnsByTable).map(([table, tableColumns]) => [
            table,
            {
                columns: buildSourceColumns(tableColumns),
                tableColumns,
                errorMessage: undefined,
            },
        ]),
    );
}

function buildSourceColumns(
    tableColumns: TableInfoSearchColumnMetadataRow[],
    currentColumns?: Partial<TagAnalyzerColumnInfo>,
): TagAnalyzerColumnInfo {
    const sColumnInfo = createTagAnalyzerColumnInfo(tableColumns, currentColumns);

    return {
        name: sColumnInfo.name || String(tableColumns[0]?.[0] ?? ''),
        time: sColumnInfo.time || String(tableColumns[1]?.[0] ?? ''),
        timeType: sColumnInfo.timeType,
        timeBaseTime: sColumnInfo.timeBaseTime,
        value: sColumnInfo.value || String(tableColumns[2]?.[0] ?? ''),
        jsonKey: sColumnInfo.jsonKey ?? currentColumns?.jsonKey ?? '',
    };
}

export async function fetchTableInfoSearchTags({
    table,
    searchText,
    columns,
}: TableInfoSearchTagSearchParams): Promise<TableInfoSearchTagSearchResult> {
    if (!table || !columns?.name) {
        return {
            items: [],
            errorMessage: undefined,
        };
    }

    const sMetaTableNameParts = table.split('.');
    const sMetaTableBaseName = '_' + sMetaTableNameParts.at(-1) + '_META';
    sMetaTableNameParts.pop();
    sMetaTableNameParts.push(sMetaTableBaseName);

    const sQualifiedMetaTableName = buildSqlIdentifierPath(
        sMetaTableNameParts.join('.'),
        'SQL metadata table name',
    );
    const sTagColumn = buildSqlIdentifierPath(columns.name, 'SQL tag column');
    const sWhereClause = searchText
        ? ` where ${sTagColumn} like ${buildSqlStringLiteral(`%${searchText}%`)}`
        : '';
    const sSql = `select * from ${sQualifiedMetaTableName}${sWhereClause} ORDER BY ${sTagColumn} LIMIT 0, ${TAG_SEARCH_LIMIT}`;
    const sRawResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSql)}`,
    });
    const sResponse = asQueryResponse(sRawResponse);
    const sHasHttpError =
        typeof sResponse?.status === 'number' && sResponse.status >= 400;
    const sErrorMessage = extractQueryErrorMessage(sResponse, sHasHttpError);

    if (sHasHttpError) {
        Toast.error(sErrorMessage ?? `Request failed (${sResponse?.status})`);
    }

    if (sResponse?.success !== true || sHasHttpError) {
        return {
            items: [],
            errorMessage: 'Tag search response was unsuccessful.',
        };
    }

    return {
        items: parseTagSearchItems(extractQueryRows(sResponse.data)),
        errorMessage: undefined,
    };
}

export async function fetchTableInfoSearchJsonColumnPaths(
    table: string,
    valueColumn: string,
): Promise<string[]> {
    const sRawResponse = await fetchDashboardJsonColumnSamples(table, valueColumn);
    const sResponse = asQueryResponse(sRawResponse);
    const sHasHttpError = typeof sResponse?.status === 'number' && sResponse.status >= 400;

    if (sResponse?.success !== true || sHasHttpError) {
        throw new Error('Failed to fetch JSON column paths.');
    }

    const sRows = extractQueryRows(sResponse.data);
    const sSamples = sRows.map((row) => (Array.isArray(row) ? row[0] : undefined));

    return extractJsonPathsFromSamples(sSamples);
}
