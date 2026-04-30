import request from '@/api/core';
import { showRequestError } from './FetchRequestErrorPresenter';
import {
    buildGroupedSeriesTimeBoundarySql,
    buildVirtualStatOrMountedTableBoundarySql,
} from './sqlBuilder/BuildTimeBoundarySql';
import {
    resolveTimeBoundaryRangePairFromNanosecondRows,
    resolveTimeBoundaryRangePairFromRows,
} from './responseResolver/TimeBoundaryResponseResolver';
import type {
    BoundarySeries,
    TableTagMap,
    VirtualStatTagSet,
} from './FetchTypes';
import type { FetchedTimeBoundaryRange } from '../time/TimeTypes';

function groupBoundarySeriesByTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): TableTagMap[] {
    const sGroupedTableMap: Record<
        string,
        {
            cols: T['sourceColumns'];
            tags: string[];
        }
    > = {};

    tableTagInfo.forEach((info) => {
        const sExistingEntry = sGroupedTableMap[info.table];
        const sTagName = info.sourceTagName || '';

        if (sExistingEntry) {
            sExistingEntry.tags.push(sTagName);
            return;
        }

        sGroupedTableMap[info.table] = {
            cols: info.sourceColumns,
            tags: [sTagName],
        };
    });

    return Object.keys(sGroupedTableMap).map((table) => ({
        table,
        tags: sGroupedTableMap[table].tags,
        cols: sGroupedTableMap[table].cols,
    }));
}

export async function fetchMinMaxTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    const groupedBoundarySeries = groupBoundarySeriesByTable(tableTagInfo);
    const sql = buildGroupedSeriesTimeBoundarySql(groupedBoundarySeries);
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    return resolveTimeBoundaryRangePairFromNanosecondRows(
        data.data?.rows as Array<[number | null, number | null]> | undefined,
    );
}

export async function fetchVirtualStatTable(
    tableName: string,
    tagNameList: string[],
    tagSet?: VirtualStatTagSet,
): Promise<FetchedTimeBoundaryRange | undefined> {
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

    return resolveTimeBoundaryRangePairFromRows(
        data.data?.rows as Array<[number | null, number | null]> | undefined,
    );
}

export const timeBoundaryRepositoryApi = {
    fetchMinMaxTable,
    fetchVirtualStatTable,
};

