import {
    fetchTableName,
    getTagPagination,
    getTagTotal,
} from './ApiRepository';
import type {
    TagSearchItem,
    TagSelectionSourceColumns,
} from '../../common/tagSelection/tagSelectionTypes';

type TableNameResponse = {
    success: boolean | undefined;
    data:
        | {
              rows: string[][] | undefined;
          }
        | undefined;
    message: string | undefined;
};

type TagTotalResponse = {
    data:
        | {
              rows: Array<[number]> | undefined;
          }
        | undefined;
};

type TagPaginationRow = [string | number, string];

type TagPaginationResponse = {
    success: boolean | undefined;
    data:
        | {
              rows: TagPaginationRow[] | undefined;
          }
        | undefined;
};

export const EMPTY_TAG_SELECTION_COLUMNS: TagSelectionSourceColumns = {
    name: '',
    time: '',
    value: '',
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
export async function fetchTagSearchColumns(aTable: string): Promise<{
    columns: TagSelectionSourceColumns | undefined;
    errorMessage: string | undefined;
}> {
    if (!aTable) {
        return {
            columns: undefined,
            errorMessage: undefined,
        };
    }

    const sResponse = (await fetchTableName(aTable)) as unknown as TableNameResponse;
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
}: {
    table: string;
    searchText: string;
    page: number;
    columns: TagSelectionSourceColumns;
}): Promise<{
    items: TagSearchItem[];
    total: number;
    columns: TagSelectionSourceColumns;
    errorMessage: string | undefined;
}> {
    if (!table) {
        return {
            items: [],
            total: 0,
            columns: EMPTY_TAG_SELECTION_COLUMNS,
            errorMessage: undefined,
        };
    }

    const [sTotalResponse, sPageResponse] = await Promise.all([
        getTagTotal(table, searchText, columns.name),
        getTagPagination(table, searchText, page, columns.name),
    ]);

    const sPageResult = sPageResponse as unknown as TagPaginationResponse;

    return {
        items: sPageResult.success
            ? normalizeTagSearchItems(sPageResult.data?.rows)
            : [],
        total: getTagTotalFromResponse(sTotalResponse as unknown as TagTotalResponse),
        columns,
        errorMessage: undefined,
    };
}
