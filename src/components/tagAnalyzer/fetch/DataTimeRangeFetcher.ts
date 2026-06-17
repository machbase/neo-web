import request from '@/api/core';
import { showRequestError } from '../feedback/RequestErrorPresenter';
import {
    buildGroupedSeriesDataTimeRangeSql,
    buildVirtualStatOrMountedTableDataTimeRangeSql,
} from './sqlBuilder/BuildDataTimeRangeSql';
import type {
    DataRangeSeries,
    TableTagMap,
} from './FetchContracts';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import { isNumericBaseTimeSourceColumns } from '../domain/SeriesDomain';
import { NANOSECONDS_PER_MILLISECOND } from '../domain/time/model/TimeConstants';
import { createTimeRangeMs } from '../domain/time/range/TimeRangeUtils';

function groupDataRangeSeriesByTable<T extends DataRangeSeries>(
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

export async function fetchSeriesDataTimeRange<T extends DataRangeSeries>(
    tableTagInfo: T[],
): Promise<TimeRangeMs | undefined> {
    const sGroupedDataRangeSeries = groupDataRangeSeriesByTable(tableTagInfo);
    const sHasNumericBaseTime = sGroupedDataRangeSeries.some((info) =>
        isNumericBaseTimeSourceColumns(info.cols),
    );
    const sHasDateTimeAxis = sGroupedDataRangeSeries.some(
        (info) => !isNumericBaseTimeSourceColumns(info.cols),
    );

    if (sHasNumericBaseTime && sHasDateTimeAxis) {
        throw new Error(
            'Numeric basetime and datetime series cannot be mixed in one panel.',
        );
    }

    const sql = buildGroupedSeriesDataTimeRangeSql(sGroupedDataRangeSeries);
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    const rows = data.data?.rows as Array<[number | null, number | null]> | undefined;

    if (sHasNumericBaseTime) {
        return createDataTimeRangeFromMillisecondRows(rows);
    }

    return createDataTimeRangeFromNanosecondRows(rows);
}

export async function fetchVirtualStatDataTimeRange(
    tableName: string,
    tagNameList: string[],
    timeColumnName?: string,
): Promise<TimeRangeMs | undefined> {
    const sql = buildVirtualStatOrMountedTableDataTimeRangeSql(
        tableName,
        tagNameList,
        timeColumnName,
    );
    const data = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
    });
    showRequestError(data);

    return createDataTimeRangeFromNanosecondRows(
        data.data?.rows as Array<[number | null, number | null]> | undefined,
    );
}

function createDataTimeRangeFromNanosecondRows(
    rows: Array<[number | null, number | null]> | undefined,
): TimeRangeMs | undefined {
    if (!rows || rows.length === 0) {
        return undefined;
    }

    return createDataTimeRangeFromMillisecondRows(
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

function createDataTimeRangeFromMillisecondRows(
    rows: Array<[number | null, number | null]> | undefined,
): TimeRangeMs | undefined {
    const sNumericRows = rows?.filter(
        (row): row is [number, number] =>
            typeof row[0] === 'number' && typeof row[1] === 'number',
    );
    if (!sNumericRows || sNumericRows.length === 0) {
        return undefined;
    }

    let sMinTime = sNumericRows[0][0];
    let sMaxTime = sNumericRows[0][1];

    for (const [aMinTime, aMaxTime] of sNumericRows.slice(1)) {
        if (aMinTime < sMinTime) {
            sMinTime = aMinTime;
        }

        if (aMaxTime > sMaxTime) {
            sMaxTime = aMaxTime;
        }
    }

    return createTimeRangeMs(sMinTime, sMaxTime);
}

