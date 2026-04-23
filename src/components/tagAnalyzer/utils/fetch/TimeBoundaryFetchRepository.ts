import request from '@/api/core';
import { showRequestError } from './FetchRequestErrorPresenter';
import {
    buildMinMaxTableQuery,
    buildVirtualStatTableQuery,
} from './TimeBoundaryFetchQueryBuilder';
import type {
    BoundarySeries,
    MinMaxTableResponse,
    VirtualStatTagSet,
} from './FetchTypes';

/**
 * Fetches the min and max table response for a series set.
 * Intent: Execute the boundary query transport without mixing repository IO into panel range rules.
 * @param {T[]} aTableTagInfo - The tag series metadata to query.
 * @param {string} aUserName - The active user name for the request.
 * @returns {Promise<MinMaxTableResponse>} The backend min/max table response.
 */
export async function fetchMinMaxTable<T extends BoundarySeries>(
    aTableTagInfo: T[],
    aUserName: string,
): Promise<MinMaxTableResponse> {
    const sQuery = buildMinMaxTableQuery(aTableTagInfo, aUserName);
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sQuery)}`,
    });
    showRequestError(sData);

    return sData as MinMaxTableResponse;
}

/**
 * Fetches the time bounds for virtual stat tags.
 * Intent: Isolate the boundary repository call used by relative last-range resolution.
 * @param {string} aTableName - The source table to inspect.
 * @param {string[]} aTagNameList - The tag names whose bounds should be resolved.
 * @param {VirtualStatTagSet} [aTagSet] - The optional column mapping used to override the time column.
 * @returns {Promise<Array<[number | null, number | null]> | undefined>} The resolved min/max rows.
 */
export async function fetchVirtualStatTable(
    aTableName: string,
    aTagNameList: string[],
    aTagSet?: VirtualStatTagSet,
): Promise<Array<[number | null, number | null]> | undefined> {
    const sQuery = buildVirtualStatTableQuery(aTableName, aTagNameList, aTagSet);
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sQuery)}`,
    });
    showRequestError(sData);

    return sData.data?.rows as Array<[number | null, number | null]> | undefined;
}

export const timeBoundaryRepositoryApi = {
    fetchMinMaxTable,
    fetchVirtualStatTable,
};
