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
import type { RawTableListData } from '../../fetch/metadata/MetadataFetchTypes';
import type {
    CreateNewPanelColumnMetadataRow,
    CreateNewPanelTagSearchItem,
} from './CreateNewPanelTypes';

const SQL_IDENTIFIER_SEGMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const SQL_LIKE_ESCAPE_CHARACTER = '!';

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

function buildSqlLikeContainsCondition(
    identifierPath: string,
    searchText: string,
): string | undefined {
    if (searchText === '') {
        return undefined;
    }

    const sEscapedSearchText = searchText.replace(
        /[!%_]/g,
        (match) => `${SQL_LIKE_ESCAPE_CHARACTER}${match}`,
    );

    return `${buildSqlIdentifierPath(identifierPath)} LIKE ${buildSqlStringLiteral(
        `%${sEscapedSearchText}%`,
    )} ESCAPE ${buildSqlStringLiteral(SQL_LIKE_ESCAPE_CHARACTER)}`;
}

type CreateNewPanelTagSearchParams = {
    table: string;
    searchText: string;
    columns: TagAnalyzerColumnInfo | undefined;
};

type CreateNewPanelTagSearchResult = {
    items: CreateNewPanelTagSearchItem[];
    errorMessage: string | undefined;
};

type CreateNewPanelTableMetadataResult = {
    columns: TagAnalyzerColumnInfo | undefined;
    tableColumns: CreateNewPanelColumnMetadataRow[];
    errorMessage: string | undefined;
};

type TableMetadataTarget = {
    databaseIdQuery: string;
    tableName: string;
    userName: string;
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

function parseTagSearchItems(rows: unknown[]): CreateNewPanelTagSearchItem[] {
    const sItems: CreateNewPanelTagSearchItem[] = [];

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

export async function fetchCreateNewPanelTableNames(): Promise<string[]> {
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

export async function fetchCreateNewPanelTableMetadata(
    table: string,
    currentColumns?: Partial<TagAnalyzerColumnInfo>,
): Promise<CreateNewPanelTableMetadataResult> {
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

function parseTableColumnMetadataRows(rows: unknown[]): CreateNewPanelColumnMetadataRow[] {
    const sTableColumns: CreateNewPanelColumnMetadataRow[] = [];

    for (const sRow of rows) {
        if (Array.isArray(sRow) && typeof sRow[0] === 'string') {
            sTableColumns.push(sRow.slice(0, 3) as CreateNewPanelColumnMetadataRow);
        }
    }

    return sTableColumns;
}

function buildSourceColumns(
    tableColumns: CreateNewPanelColumnMetadataRow[],
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

export async function fetchCreateNewPanelTags({
    table,
    searchText,
    columns,
}: CreateNewPanelTagSearchParams): Promise<CreateNewPanelTagSearchResult> {
    if (!table || !columns?.name) {
        return {
            items: [],
            errorMessage: undefined,
        };
    }

    const sMetaTableNameParts = table.split('.');
    const sMetaTableName = '_' + sMetaTableNameParts.at(-1) + '_META';
    sMetaTableNameParts.pop();
    sMetaTableNameParts.push(sMetaTableName);

    const sPrimaryMetaTableName = buildSqlIdentifierPath(
        sMetaTableNameParts.join('.'),
        'SQL metadata table name',
    );
    const sPrimarySourceColumn = buildSqlIdentifierPath(columns.name, 'SQL tag column');
    const sPrimarySearchCondition = buildSqlLikeContainsCondition(columns.name, searchText);
    const sPrimaryWhereClause = sPrimarySearchCondition ? ` where ${sPrimarySearchCondition}` : '';
    const sPrimarySql = `select * from ${sPrimaryMetaTableName}${sPrimaryWhereClause} ORDER BY ${sPrimarySourceColumn}`;
    const sPrimaryRawResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sPrimarySql)}`,
    });
    const sPrimaryResponse = asQueryResponse(sPrimaryRawResponse);

    if (sPrimaryResponse?.success === true) {
        const sPrimaryItems = parseTagSearchItems(extractQueryRows(sPrimaryResponse.data));

        if (sPrimaryItems.length > 0) {
            return {
                items: sPrimaryItems,
                errorMessage: undefined,
            };
        }
    }

    const sSourceTableName = buildSqlIdentifierPath(table, 'SQL table name');
    const sSourceColumn = buildSqlIdentifierPath(columns.name, 'SQL tag column');
    const sSourceConditions = [`${sSourceColumn} IS NOT NULL`];
    const sSourceSearchCondition = buildSqlLikeContainsCondition(columns.name, searchText);

    if (sSourceSearchCondition) {
        sSourceConditions.push(sSourceSearchCondition);
    }

    const sSourceSql = `select ${sSourceColumn}, ${sSourceColumn} from (select distinct ${sSourceColumn} from ${sSourceTableName} where ${sSourceConditions.join(' and ')} ORDER BY ${sSourceColumn})`;
    const sSourceRawResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSourceSql)}`,
    });
    const sSourceResponse = asQueryResponse(sSourceRawResponse);
    const sSourceHasHttpError =
        typeof sSourceResponse?.status === 'number' && sSourceResponse.status >= 400;
    const sSourceErrorMessage = extractQueryErrorMessage(sSourceResponse, sSourceHasHttpError);

    if (sSourceHasHttpError) {
        Toast.error(sSourceErrorMessage ?? `Request failed (${sSourceResponse?.status})`);
    }

    if (sSourceResponse?.success !== true || sSourceHasHttpError) {
        return {
            items: [],
            errorMessage: 'Tag search response was unsuccessful.',
        };
    }

    const sSourceItems = parseTagSearchItems(extractQueryRows(sSourceResponse.data));

    return {
        items: sSourceItems,
        errorMessage: undefined,
    };
}

export async function fetchCreateNewPanelJsonColumnPaths(
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
