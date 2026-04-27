import request from '@/api/core';
import {
    groupBoundarySeriesByTable,
} from './BoundarySeriesTableMap';
import { showRequestError } from './FetchRequestErrorPresenter';
import {
    buildGroupedSeriesTimeBoundarySql,
} from './sqlBuilder/BuildGroupedSeriesTimeBoundarySql';
import {
    buildVirtualStatOrMountedTableBoundarySql,
} from './sqlBuilder/BuildVirtualStatOrMountedTableBoundarySql';
import type {
    BoundarySeries,
    MinMaxTableResponse,
    VirtualStatTagSet,
} from './FetchTypes';

/**
 * Fetches the min and max table response for a series set.
 * Intent: Execute the boundary query transport without mixing repository IO into panel range rules.
 * @param {T[]} tableTagInfo - The tag series metadata to query.
 * @returns {Promise<MinMaxTableResponse>} The backend min/max table response.
 */
export async function fetchMinMaxTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): Promise<MinMaxTableResponse> {
    const sGroupedBoundarySeries = groupBoundarySeriesByTable(tableTagInfo);
    const sSql = buildGroupedSeriesTimeBoundarySql(sGroupedBoundarySeries);
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSql)}`,
    });
    showRequestError(sData);

    return sData as MinMaxTableResponse;
}

/**
 * Fetches the time bounds for virtual stat tags.
 * Intent: Isolate the boundary repository call used by relative last-range resolution.
 * @param {string} tableName - The source table to inspect.
 * @param {string[]} tagNameList - The tag names whose bounds should be resolved.
 * @param {VirtualStatTagSet} [tagSet] - The optional column mapping used to override the time column.
 * @returns {Promise<Array<[number | null, number | null]> | undefined>} The resolved min/max rows.
 */
export async function fetchVirtualStatTable(
    tableName: string,
    tagNameList: string[],
    tagSet?: VirtualStatTagSet,
): Promise<Array<[number | null, number | null]> | undefined> {
    const sSql = buildVirtualStatOrMountedTableBoundarySql(
        tableName,
        tagNameList,
        tagSet,
    );
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sSql)}`,
    });
    showRequestError(sData);

    return sData.data?.rows as Array<[number | null, number | null]> | undefined;
}

export const timeBoundaryRepositoryApi = {
    fetchMinMaxTable,
    fetchVirtualStatTable,
};
