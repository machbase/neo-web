import request from '@/api/core';
import { fetchDashboardJsonColumnSamples } from '@/api/repository/machiot';
import { ADMIN_ID } from '@/utils/constants';
import { extractJsonPathsFromSamples } from '@/utils/dashboardJsonValue';
import { createTagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import { showRequestError } from '../../feedback/RequestErrorPresenter';
import {
    EMPTY_TAG_SELECTION_COLUMNS,
    TAG_SEARCH_PAGE_LIMIT,
} from './TagSelectionConstants';
import type {
    TagSearchItem,
    TagPaginationResponse,
    TagPaginationRow,
    TagSearchColumnsResult,
    TagSearchPageParams,
    TagSearchPageResult,
    TagSelectionSourceColumns,
    TableNameResponse,
    TagTotalResponse,
} from './TagSelectionTypes';
export async function fetchTableName(tableName: string): Promise<TableNameResponse> {
    let sDatabaseIdQuery = '';
    let sResolvedTableName = tableName;
    let sUserName = ADMIN_ID.toUpperCase();
    const sTableInfos = tableName.split('.');

    if (tableName.indexOf('.') === -1 || sTableInfos.length < 3) {
        sDatabaseIdQuery = String(-1);

        if (sTableInfos.length === 2) {
            sUserName = sTableInfos[0];
            sResolvedTableName = sTableInfos[sTableInfos.length - 1];
        }
    } else {
        sDatabaseIdQuery = `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = '${sTableInfos[0]}')`;
        sResolvedTableName = sTableInfos[sTableInfos.length - 1];
        sUserName = sTableInfos[1];
    }

    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER('${sUserName}') AND MC.DATABASE_ID = ${sDatabaseIdQuery} AND MT.NAME = '${sResolvedTableName}' AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const sResponse = await request({
        method: 'GET',
        url: encodeURI(`/api/query?q=${sSql}`),
    });

    return sResponse as unknown as TableNameResponse;
}
export async function getTagPagination(
    tableName: string,
    tagFilter: string,
    pageNumber: number,
    sourceColumn: string,
    suppressRequestError = false,
): Promise<TagPaginationResponse> {
    const sTableName = getMetaTableName(tableName);
    const sWhereClause = buildTagSearchWhereClause(tagFilter, sourceColumn);
    const sOffset = (pageNumber - 1) * TAG_SEARCH_PAGE_LIMIT;

    return runTagSearchQuery<TagPaginationResponse>(
        `select * from ${sTableName}${sWhereClause} ORDER BY ${sourceColumn} LIMIT ${sOffset}, ${TAG_SEARCH_PAGE_LIMIT}`,
        suppressRequestError,
    );
}
export async function getTagTotal(
    tableName: string,
    tagFilter: string,
    sourceColumn: string,
    suppressRequestError = false,
): Promise<TagTotalResponse> {
    const sTableName = getMetaTableName(tableName);
    const sWhereClause = buildTagSearchWhereClause(tagFilter, sourceColumn);

    return runTagSearchQuery<TagTotalResponse>(
        `select count(*) from ${sTableName}${sWhereClause}`,
        suppressRequestError,
    );
}
export async function getSourceTagPagination(
    tableName: string,
    tagFilter: string,
    pageNumber: number,
    sourceColumn: string,
): Promise<TagPaginationResponse> {
    const sWhereClause = buildSourceTagSearchWhereClause(tagFilter, sourceColumn);
    const sOffset = (pageNumber - 1) * TAG_SEARCH_PAGE_LIMIT;

    return runTagSearchQuery<TagPaginationResponse>(
        `select ${sourceColumn}, ${sourceColumn} from (select distinct ${sourceColumn} from ${tableName}${sWhereClause} ORDER BY ${sourceColumn}) LIMIT ${sOffset}, ${TAG_SEARCH_PAGE_LIMIT}`,
    );
}
export async function getSourceTagTotal(
    tableName: string,
    tagFilter: string,
    sourceColumn: string,
): Promise<TagTotalResponse> {
    const sWhereClause = buildSourceTagSearchWhereClause(tagFilter, sourceColumn);

    return runTagSearchQuery<TagTotalResponse>(
        `select count(*) from (select distinct ${sourceColumn} from ${tableName}${sWhereClause})`,
    );
}

export const tagSearchApi = {
    fetchTableName,
    fetchDashboardJsonColumnSamples,
    getTagPagination,
    getTagTotal,
    getSourceTagPagination,
    getSourceTagTotal,
};
function buildTableColumns(
    rows: Array<[string, number, number] | [string, number] | string[]> | undefined,
    currentColumns?: Partial<TagSelectionSourceColumns>,
): TagSelectionSourceColumns {
    const sColumnInfo = createTagAnalyzerColumnInfo(rows ?? [], currentColumns);

    return {
        name: sColumnInfo.name || rows?.[0]?.[0] || '',
        time: sColumnInfo.time || rows?.[1]?.[0] || '',
        timeType: sColumnInfo.timeType,
        timeBaseTime: sColumnInfo.timeBaseTime,
        value: sColumnInfo.value || rows?.[2]?.[0] || '',
        jsonKey: sColumnInfo.jsonKey ?? currentColumns?.jsonKey ?? '',
    };
}
function getTagTotalFromResponse(response: TagTotalResponse): number {
    return response.data?.rows?.[0]?.[0] ?? 0;
}
function isSuccessfulTagSearchResponse(
    response: { success?: boolean | undefined },
): boolean {
    return response.success !== false;
}
function normalizeTagSearchItems(
    rows: TagPaginationRow[] | undefined,
): TagSearchItem[] {
    return (rows ?? []).map((row) => ({
        id: String(row[0]),
        name: row[1],
    }));
}
export async function fetchTagSearchColumns(
    table: string,
    currentColumns?: Partial<TagSelectionSourceColumns>,
): Promise<TagSearchColumnsResult> {
    if (!table) {
        return {
            columns: undefined,
            tableColumns: [],
            errorMessage: undefined,
        };
    }

    const sResponse = await tagSearchApi.fetchTableName(table);
    if (!sResponse.success) {
        return {
            columns: undefined,
            tableColumns: [],
            errorMessage: sResponse.message ?? '',
        };
    }
    const sRows = sResponse.data?.rows ?? [];

    return {
        columns: buildTableColumns(sRows, currentColumns),
        tableColumns: sRows,
        errorMessage: undefined,
    };
}
export async function fetchJsonColumnPaths(
    table: string,
    valueColumn: string,
): Promise<string[]> {
    if (!table || !valueColumn) {
        return [];
    }

    const sResponse: any = await tagSearchApi.fetchDashboardJsonColumnSamples(
        table,
        valueColumn,
    );
    if (!sResponse?.success) {
        return [];
    }

    const sSamples = sResponse.data?.rows?.map((row: any) => row?.[0]) ?? [];
    return extractJsonPathsFromSamples(sSamples);
}
export async function fetchTagSearchPage({
    table,
    searchText,
    page,
    columns,
}: TagSearchPageParams): Promise<TagSearchPageResult> {
    if (!table) {
        return {
            items: [],
            total: 0,
            columns: EMPTY_TAG_SELECTION_COLUMNS,
            errorMessage: undefined,
        };
    }

    const [sTotalResponse, sPageResponse] = await Promise.all([
        tagSearchApi.getTagTotal(table, searchText, columns.name, true),
        tagSearchApi.getTagPagination(table, searchText, page, columns.name, true),
    ]);
    const sPrimaryTotal = getTagTotalFromResponse(sTotalResponse);

    if (
        isSuccessfulTagSearchResponse(sTotalResponse) &&
        isSuccessfulTagSearchResponse(sPageResponse) &&
        sPrimaryTotal > 0
    ) {
        return {
            items: normalizeTagSearchItems(sPageResponse.data?.rows),
            total: sPrimaryTotal,
            columns,
            errorMessage: undefined,
        };
    }

    const [sSourceTotalResponse, sSourcePageResponse] = await Promise.all([
        tagSearchApi.getSourceTagTotal(table, searchText, columns.name),
        tagSearchApi.getSourceTagPagination(table, searchText, page, columns.name),
    ]);

    return {
        items: isSuccessfulTagSearchResponse(sSourcePageResponse)
            ? normalizeTagSearchItems(sSourcePageResponse.data?.rows)
            : [],
        total: getTagTotalFromResponse(sSourceTotalResponse),
        columns,
        errorMessage: undefined,
    };
}
function getMetaTableName(sourceTableName: string): string {
    const sSplitName = sourceTableName.split('.');
    const sTableName = '_' + sSplitName.at(-1) + '_META';
    sSplitName.pop();
    sSplitName.push(sTableName);
    return sSplitName.join('.');
}
function buildTagSearchWhereClause(tagFilter: string, sourceColumn: string): string {
    if (!tagFilter) {
        return '';
    }

    return ` where ${sourceColumn} like '%${tagFilter}%'`;
}
function buildSourceTagSearchWhereClause(
    tagFilter: string,
    sourceColumn: string,
): string {
    const sConditions = [`${sourceColumn} IS NOT NULL`];

    if (tagFilter) {
        sConditions.push(`${sourceColumn} like '%${tagFilter}%'`);
    }

    return ` where ${sConditions.join(' and ')}`;
}
async function runTagSearchQuery<TResponse>(
    sql: string,
    suppressRequestError = false,
): Promise<TResponse> {
    const sResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    if (!suppressRequestError) {
        showRequestError(sResponse);
    }

    return sResponse as TResponse;
}

