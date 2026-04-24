import type { LegacyTimeRangeInput } from '../legacy/LegacyTypes';
import { timeBoundaryRepositoryApi } from '../fetch/TimeBoundaryFetchRepository';
import type { BoundarySeries } from '../fetch/FetchTypes';
import type { ValueRangePair } from '../../TagAnalyzerCommonTypes';
import { getUserName } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { NANOSECONDS_PER_MILLISECOND } from '../fetch/FetchConstants';

/**
 * Resolves the boundary ranges for a series set.
 * Intent: Keep the async boundary lookup outside the panel range rule file and return the current range model.
 * @param {T[]} aSeriesConfigSet - The series configuration set to resolve.
 * @param {LegacyTimeRangeInput} aBoardTime - The board time input.
 * @param {LegacyTimeRangeInput} aPanelTime - The panel time input.
 * @returns {Promise<ValueRangePair | undefined>} The resolved range pair, or undefined when resolution fails.
 */
export async function resolveTimeBoundaryRanges<T extends BoundarySeries>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    return resolveBoundaryValueRangePair(aSeriesConfigSet, aBoardTime, aPanelTime);
}

/**
 * Resolves the min and max boundary ranges for a series set.
 * Intent: Return the current `ValueRangePair` model and keep legacy `bgn/end` input isolated to this boundary.
 * @param {T[]} aBaseTable - The base series list to inspect.
 * @param {LegacyTimeRangeInput} aBoardTime - The board time input.
 * @param {LegacyTimeRangeInput} aPanelTime - The panel time input.
 * @returns {Promise<ValueRangePair | undefined>} The resolved boundary ranges.
 */
async function resolveBoundaryValueRangePair<T extends BoundarySeries>(
    aBaseTable: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    const sBaseTimeRange = getActiveBoundaryInput(aBoardTime, aPanelTime);
    const sFallbackRangePair = createBoundaryRangePairFromInput(sBaseTimeRange);

    if (aBaseTable.length === 0) {
        return sFallbackRangePair;
    }
    if (sFallbackRangePair) {
        return sFallbackRangePair;
    }
    if (!shouldLoadVirtualStatBounds(sBaseTimeRange)) {
        return loadMinMaxBoundaryRangePair(aBaseTable);
    }

    const sBaseSeries = aBaseTable[0];
    const sTagNameList = aBaseTable
        .filter((aSeries) => aSeries.table === sBaseSeries.table)
        .map((aSeries) => aSeries.sourceTagName || '');
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
    aBaseTable: T[],
): Promise<ValueRangePair | undefined> {
    const sCurrentUserName = getCurrentBoundaryUserName();
    const sMinMaxResponse = await timeBoundaryRepositoryApi.fetchMinMaxTable(
        aBaseTable,
        sCurrentUserName,
    );

    return createBoundaryRangePairFromMinMaxRows(sMinMaxResponse.data?.rows);
}

function getActiveBoundaryInput(
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): LegacyTimeRangeInput {
    const sHasPanelTime = aPanelTime.bgn !== '' && aPanelTime.end !== '';

    return sHasPanelTime ? aPanelTime : aBoardTime;
}

function createBoundaryRangePairFromInput(
    aBaseTimeRange: LegacyTimeRangeInput,
): ValueRangePair | undefined {
    if (typeof aBaseTimeRange.bgn !== 'number' || typeof aBaseTimeRange.end !== 'number') {
        return undefined;
    }

    return {
        start: {
            min: aBaseTimeRange.bgn,
            max: aBaseTimeRange.bgn,
        },
        end: {
            min: aBaseTimeRange.end,
            max: aBaseTimeRange.end,
        },
    };
}

function createBoundaryRangePairFromMinMaxRows(
    aRows: Array<[number | null, number | null]> | undefined,
): ValueRangePair | undefined {
    const sBoundaryRows = aRows?.filter(
        (aRow): aRow is [number, number] =>
            typeof aRow[0] === 'number' && typeof aRow[1] === 'number',
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
    aRows: Array<[number | null, number | null]>,
): ValueRangePair | undefined {
    const sResolvedRows = aRows.filter(
        (aRow): aRow is [number, number] =>
            typeof aRow[0] === 'number' && typeof aRow[1] === 'number',
    );
    if (sResolvedRows.length === 0) {
        return undefined;
    }

    const sStartList = sResolvedRows
        .map(([aStart]) => aStart)
        .sort((aPrevious, aCurrent) => aPrevious - aCurrent);
    const sEndList = sResolvedRows
        .map(([, aEnd]) => aEnd)
        .sort((aPrevious, aCurrent) => aPrevious - aCurrent);

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

function shouldLoadVirtualStatBounds(aBaseTimeRange: LegacyTimeRangeInput): boolean {
    return (
        typeof aBaseTimeRange.bgn === 'string' &&
        aBaseTimeRange.bgn.includes('last') &&
        typeof aBaseTimeRange.end === 'string' &&
        aBaseTimeRange.end.includes('last')
    );
}

function getCurrentBoundaryUserName(): string {
    return getUserName()?.toUpperCase() ?? ADMIN_ID.toUpperCase();
}
