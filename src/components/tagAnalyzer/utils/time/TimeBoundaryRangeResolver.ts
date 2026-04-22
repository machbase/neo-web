import { normalizeLegacyTimeBoundaryRanges } from '../legacy/LegacyTimeAdapter';
import type { LegacyTimeRangeInput } from '../legacy/LegacyTypes';
import { timeBoundaryRepositoryApi } from '../fetch/TimeBoundaryFetchRepository';
import type { BoundarySeries, BoundaryTimeRange } from '../fetch/TimeBoundaryFetchTypes';
import type { ValueRangePair } from './timeTypes';

/**
 * Resolves the legacy boundary ranges for a series set.
 * Intent: Keep the async boundary lookup and legacy conversion outside the panel range rule file.
 * @param {T[]} aSeriesConfigSet - The series configuration set to resolve.
 * @param {LegacyTimeRangeInput} aBoardTime - The board time input.
 * @param {LegacyTimeRangeInput} aPanelTime - The panel time input.
 * @returns {Promise<ValueRangePair | undefined>} The resolved legacy range pair, or undefined when resolution fails.
 */
export async function resolveTimeBoundaryRanges<T extends BoundarySeries>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    const sTimeRange = await getBoundaryTimeRange(aSeriesConfigSet, aBoardTime, aPanelTime);

    return normalizeLegacyTimeBoundaryRanges(sTimeRange);
}

/**
 * Resolves the min and max boundary timestamps for a series set.
 * Intent: Fetch concrete boundary values when relative last ranges depend on backend statistics.
 * @param {T[]} aBaseTable - The base series list to inspect.
 * @param {LegacyTimeRangeInput} aBoardTime - The board time input.
 * @param {LegacyTimeRangeInput} aPanelTime - The panel time input.
 * @returns {Promise<BoundaryTimeRange>} The resolved boundary timestamps.
 */
export async function getBoundaryTimeRange<T extends BoundarySeries>(
    aBaseTable: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<BoundaryTimeRange> {
    const sUseCustomTime = aPanelTime.bgn !== '' && aPanelTime.end !== '';
    const sBaseTimeRange = sUseCustomTime ? aPanelTime : aBoardTime;
    const sResult = createBaseBoundaryTimeRange(sBaseTimeRange);

    if (!shouldLoadVirtualStatBounds(sBaseTimeRange) || aBaseTable.length === 0) {
        return sResult;
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
        return sResult;
    }

    const sResolvedRows = sVirtualStatInfo.filter(
        (aRow): aRow is [number, number] =>
            typeof aRow[0] === 'number' && typeof aRow[1] === 'number',
    );
    if (sResolvedRows.length === 0) {
        return sResult;
    }

    const sStartList = sResolvedRows
        .map(([aStart]) => aStart)
        .sort((aPrevious, aCurrent) => aPrevious - aCurrent);
    const sEndList = sResolvedRows
        .map(([, aEnd]) => aEnd)
        .sort((aPrevious, aCurrent) => aPrevious - aCurrent);

    return {
        bgn_min: sStartList[0],
        bgn_max: sStartList[sStartList.length - 1],
        end_min: sEndList[0],
        end_max: sEndList[sEndList.length - 1],
    };
}

function createBaseBoundaryTimeRange(aBaseTimeRange: LegacyTimeRangeInput): BoundaryTimeRange {
    return {
        bgn_min: aBaseTimeRange.bgn,
        bgn_max: aBaseTimeRange.bgn,
        end_min: aBaseTimeRange.end,
        end_max: aBaseTimeRange.end,
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
