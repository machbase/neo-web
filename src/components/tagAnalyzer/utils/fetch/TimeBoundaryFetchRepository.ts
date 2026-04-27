import request from '@/api/core';
import { groupBoundarySeriesByTable } from './BoundarySeriesTableMap';
import { showRequestError } from './FetchRequestErrorPresenter';
import { buildGroupedSeriesTimeBoundarySql } from './sqlBuilder/BuildGroupedSeriesTimeBoundarySql';
import { buildVirtualStatOrMountedTableBoundarySql } from './sqlBuilder/BuildVirtualStatOrMountedTableBoundarySql';
import type {
    BoundarySeries,
    MinMaxTableResponse,
    VirtualStatTagSet,
} from './FetchTypes';

export async function fetchMinMaxTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): Promise<MinMaxTableResponse> {
    const groupedBoundarySeries = groupBoundarySeriesByTable(tableTagInfo);
    const sql = buildGroupedSeriesTimeBoundarySql(groupedBoundarySeries);
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    return data as MinMaxTableResponse;
}

export async function fetchVirtualStatTable(
    tableName: string,
    tagNameList: string[],
    tagSet?: VirtualStatTagSet,
): Promise<Array<[number | null, number | null]> | undefined> {
    const sql = buildVirtualStatOrMountedTableBoundarySql(
        tableName,
        tagNameList,
        tagSet,
    );
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    return data.data?.rows as Array<[number | null, number | null]> | undefined;
}

export const timeBoundaryRepositoryApi = {
    fetchMinMaxTable,
    fetchVirtualStatTable,
};
