import { fetchVirtualStatTable } from '@/api/repository/machiot';
import type {
    SeriesColumns,
    ValueRangePair,
} from '../common/modelTypes';
import { normalizeLegacyTimeBoundaryRanges } from '../utils/legacy/LegacyUtils';
import type { LegacyTimeRangeInput } from '../utils/legacy/LegacyTypes';

type TagAnalyzerTimeBoundarySeries = {
    table: string;
    sourceTagName: string | undefined;
    colName: SeriesColumns | undefined;
};

export type TagAnalyzerBgnEndTimeRange = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

async function getTagAnalyzerBgnEndTimeRange<
    T extends TagAnalyzerTimeBoundarySeries,
>(
    aBaseTable: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<TagAnalyzerBgnEndTimeRange> {
    const sUseCustomTime = aPanelTime.bgn !== '' && aPanelTime.end !== '';
    const sBaseTimeRange = sUseCustomTime ? aPanelTime : aBoardTime;
    const sResult: TagAnalyzerBgnEndTimeRange = {
        bgn_min: sBaseTimeRange.bgn,
        bgn_max: sBaseTimeRange.bgn,
        end_min: sBaseTimeRange.end,
        end_max: sBaseTimeRange.end,
    };

    const sShouldLoadVirtualStats =
        typeof sBaseTimeRange.bgn === 'string' &&
        sBaseTimeRange.bgn.includes('last') &&
        typeof sBaseTimeRange.end === 'string' &&
        sBaseTimeRange.end.includes('last');

    if (!sShouldLoadVirtualStats || aBaseTable.length === 0) {
        return sResult;
    }

    const sBaseSeries = aBaseTable[0];
    const sTagList = aBaseTable.filter((aSeries) => aSeries.table === sBaseSeries.table);
    const sVirtualStatInfo = await fetchVirtualStatTable(
        sBaseSeries.table,
        sTagList.map((aSeries) => aSeries.sourceTagName || ''),
        sBaseSeries,
    );

    if (!sVirtualStatInfo || sVirtualStatInfo.length === 0) {
        return sResult;
    }

    const sTimeBoundaries = sVirtualStatInfo as Array<[number, number]>;
    const sBgnList = sTimeBoundaries
        .map(([aBgn]) => aBgn)
        .sort((aPrevious: number, aCurrent: number) => aPrevious - aCurrent);
    const sEndList = sTimeBoundaries
        .map(([, aEnd]) => aEnd)
        .sort((aPrevious: number, aCurrent: number) => aPrevious - aCurrent);

    return {
        bgn_min: sBgnList[0],
        bgn_max: sBgnList[sBgnList.length - 1],
        end_min: sEndList[0],
        end_max: sEndList[sEndList.length - 1],
    };
}

/**
 * Resolves TagAnalyzer time boundaries directly from sourceTagName-based series configs.
 * @param aSeriesConfigSet The TagAnalyzer series configs used to resolve the bounds.
 * @param aBoardTime The board-level time range.
 * @param aPanelTime The panel-level time range override.
 * @returns The normalized numeric time-boundary ranges for TagAnalyzer.
 */
export async function resolveTagAnalyzerTimeBoundaryRanges<
    T extends TagAnalyzerTimeBoundarySeries,
>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    const sTimeRange = await getTagAnalyzerBgnEndTimeRange(
        aSeriesConfigSet,
        aBoardTime,
        aPanelTime,
    );
    return normalizeLegacyTimeBoundaryRanges(sTimeRange);
}
