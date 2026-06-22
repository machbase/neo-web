import request from '@/api/core';
import { fetchDashboardJsonColumnSamples } from '@/api/repository/machiot';
import { ADMIN_ID } from '@/utils/constants';
import { extractJsonPathsFromSamples } from '@/utils/dashboardJsonValue';
import { createTagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import { showRequestError } from '../../feedback/RequestErrorPresenter';
import { EMPTY_TAG_SELECTION_COLUMNS, TAG_SEARCH_PAGE_LIMIT } from './TagSelectionConstants';
import type { TagSearchItem, TagSelectionColumnMetadataRow, TagSelectionSourceColumns } from './TagSelectionTypes';
import {
    buildSqlIdentifierPath,
    buildSqlLikeContainsCondition,
    buildSqlStringLiteral,
} from '../../fetch/sqlBuilder/SqlTextUtils';

type TableNameResponse = { success?: boolean; data?: { rows?: TagSelectionColumnMetadataRow[] }; message?: string };

type TagTotalResponse = { success?: boolean; data?: { rows?: Array<[number]> } };

type TagPaginationRow = [string | number, string];

type TagPaginationResponse = { success?: boolean; data?: { rows?: TagPaginationRow[] } };

type TagSearchColumnsResult = { columns: TagSelectionSourceColumns | undefined; tableColumns: TagSelectionColumnMetadataRow[]; errorMessage: string | undefined };

type TagSearchPageParams = { table: string; searchText: string; page: number; columns: TagSelectionSourceColumns };

type TagSearchPageResult = { items: TagSearchItem[]; total: number; columns: TagSelectionSourceColumns; errorMessage: string | undefined };

type JsonColumnSamplesResponse = { success?: boolean; data?: { rows?: Array<[unknown]> } };

async function fetchTableName(tableName: string): Promise<TableNameResponse> {
    let sDatabaseIdQuery = '';
    let sResolvedTableName = tableName;
    let sUserName = ADMIN_ID.toUpperCase();
    const sTableInfos = tableName.split('.');

    if (tableName.indexOf('.') === -1 || sTableInfos.length < 3) {
        sDatabaseIdQuery = String(-1);
        sResolvedTableName = buildSqlIdentifierPath(
            sResolvedTableName,
            'SQL table name',
        );

        if (sTableInfos.length === 2) {
            sUserName = buildSqlIdentifierPath(
                sTableInfos[0],
                'SQL user name',
            );
            sResolvedTableName = buildSqlIdentifierPath(
                sTableInfos[sTableInfos.length - 1],
                'SQL table name',
            );
        }
    } else {
        sDatabaseIdQuery = `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = ${buildSqlStringLiteral(sTableInfos[0])})`;
        sResolvedTableName = buildSqlIdentifierPath(
            sTableInfos[sTableInfos.length - 1],
            'SQL table name',
        );
        sUserName = buildSqlIdentifierPath(sTableInfos[1], 'SQL user name');
    }

    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER(${buildSqlStringLiteral(sUserName)}) AND MC.DATABASE_ID = ${sDatabaseIdQuery} AND MT.NAME = ${buildSqlStringLiteral(sResolvedTableName)} AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const sResponse = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSql)}`,
    });

    return sResponse as unknown as TableNameResponse;
}
async function getTagPagination(
    tableName: string,
    tagFilter: string,
    pageNumber: number,
    sourceColumn: string,
    suppressRequestError = false,
): Promise<TagPaginationResponse> {
    const sTableName = getMetaTableName(tableName);
    const sWhereClause = buildTagSearchWhereClause(tagFilter, sourceColumn);
    const sSourceColumn = buildSqlIdentifierPath(sourceColumn, 'SQL tag column');
    const sOffset = (pageNumber - 1) * TAG_SEARCH_PAGE_LIMIT;

    return runTagSearchQuery<TagPaginationResponse>(
        `select * from ${sTableName}${sWhereClause} ORDER BY ${sSourceColumn} LIMIT ${sOffset}, ${TAG_SEARCH_PAGE_LIMIT}`,
        suppressRequestError,
    );
}
async function getTagTotal(
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
async function getSourceTagPagination(
    tableName: string,
    tagFilter: string,
    pageNumber: number,
    sourceColumn: string,
): Promise<TagPaginationResponse> {
    const sWhereClause = buildSourceTagSearchWhereClause(tagFilter, sourceColumn);
    const sTableName = buildSqlIdentifierPath(tableName, 'SQL table name');
    const sSourceColumn = buildSqlIdentifierPath(sourceColumn, 'SQL tag column');
    const sOffset = (pageNumber - 1) * TAG_SEARCH_PAGE_LIMIT;

    return runTagSearchQuery<TagPaginationResponse>(
        `select ${sSourceColumn}, ${sSourceColumn} from (select distinct ${sSourceColumn} from ${sTableName}${sWhereClause} ORDER BY ${sSourceColumn}) LIMIT ${sOffset}, ${TAG_SEARCH_PAGE_LIMIT}`,
    );
}
async function getSourceTagTotal(
    tableName: string,
    tagFilter: string,
    sourceColumn: string,
): Promise<TagTotalResponse> {
    const sWhereClause = buildSourceTagSearchWhereClause(tagFilter, sourceColumn);
    const sTableName = buildSqlIdentifierPath(tableName, 'SQL table name');

    return runTagSearchQuery<TagTotalResponse>(
        `select count(*) from (select distinct ${buildSqlIdentifierPath(
            sourceColumn,
            'SQL tag column',
        )} from ${sTableName}${sWhereClause})`,
    );
}

const emptyColumnsResult = (errorMessage?: string): TagSearchColumnsResult => ({
    columns: undefined,
    tableColumns: [],
    errorMessage,
});

function buildTableColumns(
    rows: TagSelectionColumnMetadataRow[] | undefined,
    currentColumns?: Partial<TagSelectionSourceColumns>,
): TagSelectionSourceColumns {
    const sColumnInfo = createTagAnalyzerColumnInfo(rows ?? [], currentColumns);

    return {
        name: sColumnInfo.name || getColumnName(rows?.[0]),
        time: sColumnInfo.time || getColumnName(rows?.[1]),
        timeType: sColumnInfo.timeType,
        timeBaseTime: sColumnInfo.timeBaseTime,
        value: sColumnInfo.value || getColumnName(rows?.[2]),
        jsonKey: sColumnInfo.jsonKey ?? currentColumns?.jsonKey ?? '',
    };
}
function getColumnName(row: TagSelectionColumnMetadataRow | undefined): string {
    const sColumnName = row?.[0];
    return typeof sColumnName === 'string' ? sColumnName : '';
}
function getTagTotalFromResponse(response: TagTotalResponse): number {
    const sTotal = response.data?.rows?.[0]?.[0];
    if (typeof sTotal !== 'number') {
        throw new Error('Tag total response did not contain a numeric total.');
    }

    return sTotal;
}
function isSuccessfulTagSearchResponse(
    response: { success?: boolean | undefined },
): boolean {
    return response.success === true;
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
        return emptyColumnsResult();
    }

    const sResponse = await fetchTableName(table);
    if (!sResponse.success) {
        return emptyColumnsResult(sResponse.message ?? '');
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
        throw new Error('Cannot fetch JSON column paths without table and value column.');
    }

    const sResponse = await fetchDashboardJsonColumnSamples(
        table,
        valueColumn,
    ) as JsonColumnSamplesResponse;
    if (!sResponse?.success) {
        throw new Error('Failed to fetch JSON column paths.');
    }

    const sSamples = sResponse.data?.rows?.map((row) => row[0]) ?? [];
    return extractJsonPathsFromSamples(sSamples);
}
export async function fetchTagSearchPage({
    table,
    searchText,
    page,
    columns,
}: TagSearchPageParams): Promise<TagSearchPageResult> {
    if (!table) {
        return { items: [], total: 0, columns: EMPTY_TAG_SELECTION_COLUMNS, errorMessage: undefined };
    }

    const [sTotalResponse, sPageResponse] = await Promise.all([
        getTagTotal(table, searchText, columns.name, true),
        getTagPagination(table, searchText, page, columns.name, true),
    ]);
    const sPrimaryTotal = isSuccessfulTagSearchResponse(sTotalResponse)
        ? getTagTotalFromResponse(sTotalResponse)
        : 0;

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
        getSourceTagTotal(table, searchText, columns.name),
        getSourceTagPagination(table, searchText, page, columns.name),
    ]);

    if (
        !isSuccessfulTagSearchResponse(sSourceTotalResponse) ||
        !isSuccessfulTagSearchResponse(sSourcePageResponse)
    ) {
        throw new Error('Tag search response was unsuccessful.');
    }

    return {
        items: normalizeTagSearchItems(sSourcePageResponse.data?.rows),
        total: getTagTotalFromResponse(sSourceTotalResponse),
        columns,
        errorMessage: undefined,
    };
}

const tagSearchCondition = (tagFilter: string, sourceColumn: string) =>
    buildSqlLikeContainsCondition(sourceColumn, tagFilter);

function getMetaTableName(sourceTableName: string): string {
    const sSplitName = sourceTableName.split('.');
    const sTableName = '_' + sSplitName.at(-1) + '_META';
    sSplitName.pop();
    sSplitName.push(sTableName);
    return buildSqlIdentifierPath(
        sSplitName.join('.'),
        'SQL metadata table name',
    );
}
function buildTagSearchWhereClause(tagFilter: string, sourceColumn: string): string {
    const sCondition = tagSearchCondition(tagFilter, sourceColumn);
    return sCondition ? ` where ${sCondition}` : '';
}
function buildSourceTagSearchWhereClause(
    tagFilter: string,
    sourceColumn: string,
): string {
    const sSourceColumn = buildSqlIdentifierPath(sourceColumn, 'SQL tag column');
    const sConditions = [`${sSourceColumn} IS NOT NULL`];
    const sTagCondition = tagSearchCondition(tagFilter, sourceColumn);

    if (sTagCondition) sConditions.push(sTagCondition);

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

