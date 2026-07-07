import request from '@/api/core';
import { fetchDashboardJsonColumnSamples } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import { parseTables } from '@/utils';
import { extractJsonPathsFromSamples } from '@/utils/dashboardJsonValue';
import type { TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
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
};

type TableInfoSearchTagSearchResult = {
    items: TableInfoSearchTagSearchItem[];
    total: number;
    errorMessage: string | undefined;
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
    const sWhereClause = searchText
        ? ` where ${sTagColumn} like ${buildSqlStringLiteral(`%${searchText}%`)}`
        : '';
    const sSafePageSize = Math.max(1, Math.floor(pageSize));
    const sOffset = (Math.max(1, Math.floor(page)) - 1) * sSafePageSize;
    const sListSql = `select ${sTagColumn}, ${sTagColumn} from ${sQualifiedMetaTableName}${sWhereClause} ORDER BY ${sTagColumn} LIMIT ${sOffset}, ${sSafePageSize}`;
    const sTotalSql = `select count(*) from ${sQualifiedMetaTableName}${sWhereClause}`;
    const [sRawResponse, sRawTotalResponse] = await Promise.all([
        request({
            method: 'GET',
            url: `/api/query?q=${encodeURIComponent(sListSql)}`,
        }),
        request({
            method: 'GET',
            url: `/api/query?q=${encodeURIComponent(sTotalSql)}`,
        }),
    ]);
    const sResponse = asQueryResponse(sRawResponse);
    const sTotalResponse = asQueryResponse(sRawTotalResponse);
    const sHasHttpError =
        typeof sResponse?.status === 'number' && sResponse.status >= 400;
    const sHasTotalHttpError =
        typeof sTotalResponse?.status === 'number' && sTotalResponse.status >= 400;
    const sErrorMessage = extractQueryErrorMessage(sResponse, sHasHttpError)
        ?? extractQueryErrorMessage(sTotalResponse, sHasTotalHttpError);

    if (sHasHttpError || sHasTotalHttpError) {
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
            errorMessage: 'Tag search response was unsuccessful.',
        };
    }

    return {
        items: parseTagSearchItems(extractQueryRows(sResponse.data)),
        total: parseTagSearchTotal(extractQueryRows(sTotalResponse.data)),
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
