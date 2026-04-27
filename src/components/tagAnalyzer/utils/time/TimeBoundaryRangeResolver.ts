import type { StoredTimeRangeInput } from './StoredTimeRangeAdapter';
import { timeBoundaryRepositoryApi } from '../fetch/TimeBoundaryFetchRepository';
import type { BoundarySeries } from '../fetch/FetchTypes';
import type { ValueRangePair } from '../../TagAnalyzerCommonTypes';
import { NANOSECONDS_PER_MILLISECOND } from './constants/UnixTimeConstants';

/**
 * Resolves the boundary ranges for a series set.
 * Intent: Keep the async boundary lookup outside the panel range rule file and return the current range model.
 * @param {T[]} seriesConfigSet - The series configuration set to resolve.
 * @param {StoredTimeRangeInput} boardTime - The board time input.
 * @param {StoredTimeRangeInput} panelTime - The panel time input.
 * @returns {Promise<ValueRangePair | undefined>} The resolved range pair, or undefined when resolution fails.
 */
export async function resolveTimeBoundaryRanges<T extends BoundarySeries>(
    seriesConfigSet: T[],
    boardTime: StoredTimeRangeInput,
    panelTime: StoredTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    return resolveBoundaryValueRangePair(seriesConfigSet, boardTime, panelTime);
}

/**
 * Resolves the min and max boundary ranges for a series set.
 * Intent: Return the current `ValueRangePair` model and keep legacy `bgn/end` input isolated to this boundary.
 * @param {T[]} baseTable - The base series list to inspect.
 * @param {StoredTimeRangeInput} boardTime - The board time input.
 * @param {StoredTimeRangeInput} panelTime - The panel time input.
 * @returns {Promise<ValueRangePair | undefined>} The resolved boundary ranges.
 */
async function resolveBoundaryValueRangePair<T extends BoundarySeries>(
    baseTable: T[],
    boardTime: StoredTimeRangeInput,
    panelTime: StoredTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    const sBaseTimeRange = getActiveBoundaryInput(boardTime, panelTime);
    const sFallbackRangePair = createBoundaryRangePairFromInput(sBaseTimeRange);

    if (baseTable.length === 0) {
        return sFallbackRangePair;
    }
    if (sFallbackRangePair) {
        return sFallbackRangePair;
    }
    if (!shouldLoadVirtualStatBounds(sBaseTimeRange)) {
        return loadMinMaxBoundaryRangePair(baseTable);
    }

    const sBaseSeries = baseTable[0];
    const sTagNameList = baseTable
        .filter((series) => series.table === sBaseSeries.table)
        .map((series) => series.sourceTagName || '');
    const sVirtualStatInfo = await timeBoundaryRepositoryApi.fetchVirtualStatTable(
        sBaseSeries.table,
        sTagNameList,
        sBaseSeries,
    );

    if (!sVirtualStatInfo || sVirtualStatInfo.length === 0) {
        return sFallbackRangePair;
    }

    return createBoundaryRangePairFromRows(sVirtualStatInfo) ?? sFallbackRangePair;
}

async function loadMinMaxBoundaryRangePair<T extends BoundarySeries>(
    baseTable: T[],
): Promise<ValueRangePair | undefined> {
    const sMinMaxResponse = await timeBoundaryRepositoryApi.fetchMinMaxTable(baseTable);

    return createBoundaryRangePairFromMinMaxRows(sMinMaxResponse.data?.rows);
}

function getActiveBoundaryInput(
    boardTime: StoredTimeRangeInput,
    panelTime: StoredTimeRangeInput,
): StoredTimeRangeInput {
    const sHasPanelTime = panelTime.bgn !== '' && panelTime.end !== '';

    return sHasPanelTime ? panelTime : boardTime;
}

function createBoundaryRangePairFromInput(
    baseTimeRange: StoredTimeRangeInput,
): ValueRangePair | undefined {
    if (typeof baseTimeRange.bgn !== 'number' || typeof baseTimeRange.end !== 'number') {
        return undefined;
    }

    return {
        start: {
            min: baseTimeRange.bgn,
            max: baseTimeRange.bgn,
        },
        end: {
            min: baseTimeRange.end,
            max: baseTimeRange.end,
        },
    };
}

function createBoundaryRangePairFromMinMaxRows(
    rows: Array<[number | null, number | null]> | undefined,
): ValueRangePair | undefined {
    const sBoundaryRows = rows?.filter(
        (row): row is [number, number] =>
            typeof row[0] === 'number' && typeof row[1] === 'number',
    );
    if (!sBoundaryRows || sBoundaryRows.length === 0) {
        return undefined;
    }

    const sRangeRows = sBoundaryRows.map(([aStartNanoseconds, aEndNanoseconds]) => [
        Math.floor(aStartNanoseconds / NANOSECONDS_PER_MILLISECOND),
        Math.floor(aEndNanoseconds / NANOSECONDS_PER_MILLISECOND),
    ] as [number, number]);

    return createBoundaryRangePairFromRows(sRangeRows);
}

function createBoundaryRangePairFromRows(
    rows: Array<[number | null, number | null]>,
): ValueRangePair | undefined {
    const sResolvedRows = rows.filter(
        (row): row is [number, number] =>
            typeof row[0] === 'number' && typeof row[1] === 'number',
    );
    if (sResolvedRows.length === 0) {
        return undefined;
    }

    const sStartList = sResolvedRows
        .map(([aStart]) => aStart)
        .sort((previous, current) => previous - current);
    const sEndList = sResolvedRows
        .map(([, aEnd]) => aEnd)
        .sort((previous, current) => previous - current);

    return {
        start: {
            min: sStartList[0],
            max: sStartList[sStartList.length - 1],
        },
        end: {
            min: sEndList[0],
            max: sEndList[sEndList.length - 1],
        },
    };
}

function shouldLoadVirtualStatBounds(baseTimeRange: StoredTimeRangeInput): boolean {
    return (
        typeof baseTimeRange.bgn === 'string' &&
        baseTimeRange.bgn.includes('last') &&
        typeof baseTimeRange.end === 'string' &&
        baseTimeRange.end.includes('last')
    );
}
