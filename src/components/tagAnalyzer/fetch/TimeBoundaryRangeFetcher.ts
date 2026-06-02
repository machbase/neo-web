import request from '@/api/core';
import { showRequestError } from '../feedback/RequestErrorPresenter';
import {
    buildGroupedSeriesTimeBoundarySql,
    buildVirtualStatOrMountedTableBoundarySql,
} from './sqlBuilder/BuildTimeBoundarySql';
import type {
    BoundarySeries,
    TableTagMap,
} from './FetchContracts';
import type { FetchedTimeBoundaryRange } from '../domain/time/TimeTypes';
import { isNumericBaseTimeSourceColumns } from '../domain/SeriesDomain';
import { createAbsoluteTimeBoundary } from '../domain/time/TimeBoundaryInput';
import { NANOSECONDS_PER_MILLISECOND } from '../domain/time/TimeConstants';

function groupBoundarySeriesByTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): TableTagMap[] {
    const sGroupedTableMap: Record<
        string,
        {
            table: string;
            cols: T['sourceColumns'];
            tags: string[];
        }
    > = {};

    tableTagInfo.forEach((info) => {
        const sGroupKey = `${info.table}:${info.sourceColumns.time}`;
        const sExistingEntry = sGroupedTableMap[sGroupKey];
        const sTagName = info.sourceTagName || '';

        if (sExistingEntry) {
            sExistingEntry.tags.push(sTagName);
            return;
        }

        sGroupedTableMap[sGroupKey] = {
            table: info.table,
            cols: info.sourceColumns,
            tags: [sTagName],
        };
    });

    return Object.keys(sGroupedTableMap).map((groupKey) => ({
        table: sGroupedTableMap[groupKey].table,
        tags: sGroupedTableMap[groupKey].tags,
        cols: sGroupedTableMap[groupKey].cols,
    }));
}

export async function fetchMinMaxTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    const groupedBoundarySeries = groupBoundarySeriesByTable(tableTagInfo);
    const sHasNumericBaseTime = groupedBoundarySeries.some((info) =>
        isNumericBaseTimeSourceColumns(info.cols),
    );
    const sHasDateTimeAxis = groupedBoundarySeries.some(
        (info) => !isNumericBaseTimeSourceColumns(info.cols),
    );

    if (sHasNumericBaseTime && sHasDateTimeAxis) {
        throw new Error(
            'Numeric basetime and datetime series cannot be mixed in one panel.',
        );
    }

    const sql = buildGroupedSeriesTimeBoundarySql(groupedBoundarySeries);
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    const rows = data.data?.rows as Array<[number | null, number | null]> | undefined;

    return sHasNumericBaseTime
        ? createTimeBoundaryRangeFromMillisecondRows(rows)
        : createTimeBoundaryRangeFromNanosecondRows(rows);
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

    return createTimeBoundaryRangeFromNanosecondRows(
        data.data?.rows as Array<[number | null, number | null]> | undefined,
    );
}

function createTimeBoundaryRangeFromNanosecondRows(
    rows: Array<[number | null, number | null]> | undefined,
): FetchedTimeBoundaryRange | undefined {
    if (!rows || rows.length === 0) {
        return undefined;
    }

    return createTimeBoundaryRangeFromMillisecondRows(
        rows.map(([aStartNanoseconds, aEndNanoseconds]) => [
            typeof aStartNanoseconds === 'number'
                ? Math.floor(aStartNanoseconds / NANOSECONDS_PER_MILLISECOND)
                : null,
            typeof aEndNanoseconds === 'number'
                ? Math.floor(aEndNanoseconds / NANOSECONDS_PER_MILLISECOND)
                : null,
        ]),
    );
}

function createTimeBoundaryRangeFromMillisecondRows(
    rows: Array<[number | null, number | null]> | undefined,
): FetchedTimeBoundaryRange | undefined {
    const sNumericRows = rows?.filter(
        (row): row is [number, number] =>
            typeof row[0] === 'number' && typeof row[1] === 'number',
    );
    if (!sNumericRows || sNumericRows.length === 0) {
        return undefined;
    }

    let sStartMin = sNumericRows[0][0];
    let sStartMax = sNumericRows[0][0];
    let sEndMin = sNumericRows[0][1];
    let sEndMax = sNumericRows[0][1];

    for (const [aStart, aEnd] of sNumericRows.slice(1)) {
        if (aStart < sStartMin) {
            sStartMin = aStart;
        }

        if (aStart > sStartMax) {
            sStartMax = aStart;
        }

        if (aEnd < sEndMin) {
            sEndMin = aEnd;
        }

        if (aEnd > sEndMax) {
            sEndMax = aEnd;
        }
    }

    return {
        start: {
            min: createAbsoluteTimeBoundary(sStartMin),
            max: createAbsoluteTimeBoundary(sStartMax),
        },
        end: {
            min: createAbsoluteTimeBoundary(sEndMin),
            max: createAbsoluteTimeBoundary(sEndMax),
        },
    };
}

