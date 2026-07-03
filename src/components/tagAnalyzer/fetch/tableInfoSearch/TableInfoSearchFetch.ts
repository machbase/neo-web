import request from '@/api/core';
import { fetchDashboardJsonColumnSamples } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import { parseTables } from '@/utils';
import { extractJsonPathsFromSamples } from '@/utils/dashboardJsonValue';
import type { TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
    joinSqlLines,
} from '../sqlBuilder/SqlTextUtils';

export const TABLE_INFO_SEARCH_TAG_PAGE_SIZE = 10;

type RawTableListData = {
    columns: unknown[];
    rows: unknown[];
};

export type TableInfoSearchTagSearchItem = {
    id: string;
    name: string;
};

type TableInfoSearchTagSearchParams = {
    table: string;
    searchText: string;
    columns: TagAnalyzerColumnInfo | undefined;
    page?: number;
    pageSize?: number;
    suppressToast?: boolean;
};

type TableInfoSearchTagSearchResult = {
    items: TableInfoSearchTagSearchItem[];
    total: number;
    errorMessage: string | undefined;
};

type TagSearchTotalCacheResult = {
    response: QueryResponse | undefined;
    hasHttpError: boolean;
    total: number;
};

type QueryResponse = {
    success?: unknown;
    data?: unknown;
    status?: unknown;
    statusText?: unknown;
    message?: unknown;
    reason?: unknown;
};

const TAG_SEARCH_TOTAL_CACHE = new Map<string, Promise<TagSearchTotalCacheResult>>();

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
            (typeof sRow[0] === 'string' || typeof sRow[0] === 'number')
        ) {
            sItems.push({ id: String(sRow[0]), name: String(sRow[0]) });
        }
    }

    return sItems;
}

function parseTagSearchTotal(rows: unknown[]): number {
    const sFirstRow = rows[0];
    if (!Array.isArray(sFirstRow)) {
        return 0;
    }

    const sTotal = Number(sFirstRow[0]);
    return Number.isFinite(sTotal) ? Math.max(0, Math.floor(sTotal)) : 0;
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

export async function fetchTableInfoSearchTags({
    table,
    searchText,
    columns,
    page = 1,
    pageSize = TABLE_INFO_SEARCH_TAG_PAGE_SIZE,
    suppressToast = false,
}: TableInfoSearchTagSearchParams): Promise<TableInfoSearchTagSearchResult> {
    if (!table || !columns?.name) {
        return {
            items: [],
            total: 0,
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
    const sWhereSql = searchText
        ? `WHERE ${sTagColumn} LIKE ${buildSqlStringLiteral(`%${searchText}%`)}`
        : '';
    const sSafePageSize = Math.max(1, Math.floor(pageSize));
    const sOffset = (Math.max(1, Math.floor(page)) - 1) * sSafePageSize;
    const sListSql = joinSqlLines([
        `SELECT ${sTagColumn}`,
        `FROM ${sQualifiedMetaTableName}`,
        sWhereSql,
        `ORDER BY ${sTagColumn}`,
        `LIMIT ${sOffset}, ${sSafePageSize}`,
    ]);
    const sTotalSql = joinSqlLines([
        'SELECT count(*)',
        `FROM ${sQualifiedMetaTableName}`,
        sWhereSql,
    ]);
    const sTotalCacheKey = buildTagSearchTotalCacheKey(
        sQualifiedMetaTableName,
        sTagColumn,
        searchText,
    );
    const [sRawResponse, sTotalResult] = await Promise.all([
        request({
            method: 'GET',
            url: `/api/query?q=${encodeURIComponent(sListSql)}`,
        }),
        fetchCachedTagSearchTotal(sTotalCacheKey, sTotalSql),
    ]);
    const sResponse = asQueryResponse(sRawResponse);
    const sTotalResponse = sTotalResult.response;
    const sHasHttpError =
        typeof sResponse?.status === 'number' && sResponse.status >= 400;
    const sHasTotalHttpError = sTotalResult.hasHttpError;
    const sErrorMessage = extractQueryErrorMessage(sResponse, sHasHttpError)
        ?? extractQueryErrorMessage(sTotalResponse, sHasTotalHttpError);

    if (!suppressToast && (sHasHttpError || sHasTotalHttpError)) {
        Toast.error(
            sErrorMessage ??
                `Request failed (${sResponse?.status ?? sTotalResponse?.status})`,
        );
    }

    if (
        sResponse?.success !== true ||
        sTotalResponse?.success !== true ||
        sHasHttpError ||
        sHasTotalHttpError
    ) {
        return {
            items: [],
            total: 0,
            errorMessage: sErrorMessage ?? 'Tag search response was unsuccessful.',
        };
    }

    return {
        items: parseTagSearchItems(extractQueryRows(sResponse.data)),
        total: sTotalResult.total,
        errorMessage: undefined,
    };
}

function buildTagSearchTotalCacheKey(
    metaTableName: string,
    tagColumn: string,
    searchText: string,
): string {
    return [metaTableName, tagColumn, searchText].join('\u0000');
}

function fetchCachedTagSearchTotal(
    cacheKey: string,
    totalSql: string,
): Promise<TagSearchTotalCacheResult> {
    const sCachedResult = TAG_SEARCH_TOTAL_CACHE.get(cacheKey);
    if (sCachedResult) {
        return sCachedResult;
    }

    const sResult = request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(totalSql)}`,
    }).then((rawResponse) => {
        const sResponse = asQueryResponse(rawResponse);
        const sHasHttpError =
            typeof sResponse?.status === 'number' && sResponse.status >= 400;

        if (sResponse?.success !== true || sHasHttpError) {
            TAG_SEARCH_TOTAL_CACHE.delete(cacheKey);
        }

        return {
            response: sResponse,
            hasHttpError: sHasHttpError,
            total: parseTagSearchTotal(extractQueryRows(sResponse?.data)),
        };
    }, (error) => {
        TAG_SEARCH_TOTAL_CACHE.delete(cacheKey);
        throw error;
    });

    TAG_SEARCH_TOTAL_CACHE.set(cacheKey, sResult);
    return sResult;
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
