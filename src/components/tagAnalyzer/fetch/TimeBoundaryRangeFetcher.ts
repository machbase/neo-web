import request from '@/api/core';
import { showRequestError } from '../feedback/RequestErrorPresenter';
import {
    buildGroupedSeriesTimeBoundarySql,
    buildVirtualStatOrMountedTableBoundarySql,
} from './sqlBuilder/BuildTimeBoundarySql';
import {
    createTimeBoundaryRangeFromMillisecondRows,
    createTimeBoundaryRangeFromNanosecondRows,
} from '../domain/time/TimeBoundaryRangeRowConverters';
import type {
    BoundarySeries,
    TableTagMap,
} from './FetchContracts';
import type { FetchedTimeBoundaryRange } from '../domain/time/TimeTypes';

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

    return createTimeBoundaryRangeFromNanosecondRows(
        data.data?.rows as Array<[number | null, number | null]> | undefined,
    );
}

export async function fetchVirtualStatTable(
    tableName: string,
    tagNameList: string[],
    timeColumnName?: string,
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sql = buildVirtualStatOrMountedTableBoundarySql(
        tableName,
        tagNameList,
        timeColumnName,
    );
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    return createTimeBoundaryRangeFromMillisecondRows(
        data.data?.rows as Array<[number | null, number | null]> | undefined,
    );
}

