import request from '@/api/core';
import { ADMIN_ID } from '@/utils/constants';
import { showRequestError } from '../utils/fetch/FetchRequestErrorPresenter';
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

/**
 * Fetches the source column metadata for a table.
 * Intent: Query the system catalog so tag search can resolve the name, time, and value columns.
 *
 * @param aTableName The table name to inspect.
 * @returns The repository response containing the table column metadata rows.
 */
export async function fetchTableName(aTableName: string): Promise<TableNameResponse> {
    let sDatabaseIdQuery = '';
    let sResolvedTableName = aTableName;
    let sUserName = ADMIN_ID.toUpperCase();
    const sTableInfos = aTableName.split('.');

    if (aTableName.indexOf('.') === -1 || sTableInfos.length < 3) {
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

    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER('${sUserName}') AND MC.DATABASE_ID = ${sDatabaseIdQuery} AND MT.NAME = '${sResolvedTableName}' AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const sResponse = await request({
        method: 'GET',
        url: encodeURI(`/api/query?q=${sSql}`),
    });

    return sResponse as unknown as TableNameResponse;
}

/**
 * Fetches one page of tag metadata rows from a table meta source.
 * Intent: Centralize paging query construction for the tag selection UI.
 *
 * @param aTableName The source table whose meta table should be queried.
 * @param aTagFilter The optional tag-name filter.
 * @param aPageNumber The 1-based page index to request.
 * @param aSourceColumn The column name to filter and sort by.
 * @returns The repository response containing one page of tag rows.
 */
export async function getTagPagination(
    aTableName: string,
    aTagFilter: string,
    aPageNumber: number,
    aSourceColumn: string,
): Promise<TagPaginationResponse> {
    const sFilter = aTagFilter ? `${aSourceColumn} like '%${aTagFilter}%'` : '';
    const sLimit = `${(aPageNumber - 1) * TAG_SEARCH_PAGE_LIMIT}, ${TAG_SEARCH_PAGE_LIMIT}`;
    const sTableName = getMetaTableName(aTableName);
    const sData = await request({
        method: 'GET',
        url:
            `/api/query?q=` +
            encodeURIComponent(
                `select * from ${sTableName}${
                    sFilter !== ''
                        ? ' where ' + sFilter + ` ORDER BY ${aSourceColumn} `
                        : ` ORDER BY ${aSourceColumn} `
                } LIMIT ${sLimit}`,
            ),
    });
    showRequestError(sData);

    return sData as unknown as TagPaginationResponse;
}

/**
 * Fetches the total number of tag rows matching a filter.
 * Intent: Let the tag selection UI compute pagination totals with the same meta-table rules as page fetches.
 *
 * @param aTableName The source table whose meta table should be queried.
 * @param aTagFilter The optional tag-name filter.
 * @param aSourceColumn The column name to filter by.
 * @returns The repository response containing the matching tag total.
 */
export async function getTagTotal(
    aTableName: string,
    aTagFilter: string,
    aSourceColumn: string,
): Promise<TagTotalResponse> {
    const sTableName = getMetaTableName(aTableName);
    const sFilter = aTagFilter ? `${aSourceColumn} like '%${aTagFilter}%'` : '';
    const sData = await request({
        method: 'GET',
        url:
            `/api/query?q=` +
            encodeURIComponent(
                `select count(*) from ${sTableName}${sFilter !== '' ? ' where ' + sFilter : ''}`,
            ),
    });
    showRequestError(sData);

    return sData as unknown as TagTotalResponse;
}

export const tagSearchApi = {
    fetchTableName,
    getTagPagination,
    getTagTotal,
};

/**
 * Builds the tag-search column mapping from a repository response.
 * Intent: Normalize the three returned columns into the shape used by the tag search UI.
 *
 * @param aRows The repository rows that contain the column names.
 * @returns The normalized tag-search columns.
 */
function buildTableColumns(aRows: string[][] | undefined): TagSelectionSourceColumns {
    return {
        name: aRows?.[0]?.[0] ?? '',
        time: aRows?.[1]?.[0] ?? '',
        value: aRows?.[2]?.[0] ?? '',
    };
}

/**
 * Reads the tag total from a repository response.
 * Intent: Keep total extraction separate from pagination handling.
 *
 * @param aResponse The total-response payload.
 * @returns The total count reported by the repository.
 */
function getTagTotalFromResponse(aResponse: TagTotalResponse): number {
    return aResponse.data?.rows?.[0]?.[0] ?? 0;
}

/**
 * Normalizes tag-search rows into UI items.
 * Intent: Convert pagination rows into the item shape expected by the tag picker.
 *
 * @param aRows The pagination rows to normalize.
 * @returns The normalized tag-search items.
 */
function normalizeTagSearchItems(
    aRows: TagPaginationRow[] | undefined,
): TagSearchItem[] {
    return (aRows ?? []).map((aRow) => ({
        id: String(aRow[0]),
        name: aRow[1],
    }));
}

/**
 * Fetches the searchable column names for a table.
 * Intent: Resolve the tag-search column metadata before the search UI runs a query.
 *
 * @param aTable The table name to inspect.
 * @returns The resolved columns and any error message.
 */
export async function fetchTagSearchColumns(aTable: string): Promise<TagSearchColumnsResult> {
    if (!aTable) {
        return {
            columns: undefined,
            errorMessage: undefined,
        };
    }

    const sResponse = await tagSearchApi.fetchTableName(aTable);
    if (!sResponse.success) {
        return {
            columns: undefined,
            errorMessage: sResponse.message ?? '',
        };
    }

    return {
        columns: buildTableColumns(sResponse.data?.rows),
        errorMessage: undefined,
    };
}

/**
 * Fetches one page of tag-search results.
 * Intent: Load the searchable items and total count in one request cycle.
 *
 * @param table The table name to query.
 * @param searchText The search text to filter by.
 * @param page The page index to request.
 * @param columns The resolved search columns to use.
 * @returns The page items, total count, columns, and error message.
 */
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
        tagSearchApi.getTagTotal(table, searchText, columns.name),
        tagSearchApi.getTagPagination(table, searchText, page, columns.name),
    ]);

    return {
        items: sPageResponse.success
            ? normalizeTagSearchItems(sPageResponse.data?.rows)
            : [],
        total: getTagTotalFromResponse(sTotalResponse),
        columns,
        errorMessage: undefined,
    };
}

/**
 * Builds the meta-table name for a source table.
 * Intent: Keep meta-table naming logic in one place for pagination and total queries.
 *
 * @param aSourceTableName The source table name.
 * @returns The derived meta-table name.
 */
function getMetaTableName(aSourceTableName: string): string {
    const sSplitName = aSourceTableName.split('.');
    const sTableName = '_' + sSplitName.at(-1) + '_META';
    sSplitName.pop();
    sSplitName.push(sTableName);
    return sSplitName.join('.');
}
