import { fetchOnMinMaxTable } from './boundary/fetchOnMinMaxTable';
import { getBgnEndTimeRange } from './boundary/getBgnEndTimeRange';
import type {
    SeriesColumns,
    ValueRangePair,
} from './common/modelTypes';
import {
    normalizeLegacyTimeBoundaryRanges,
} from './utils/legacy/LegacyUtils';
import type { LegacyTimeRangeInput } from './utils/legacy/LegacyTypes';
export type TagAnalyzerMinMaxTableResponse = {
    data:
        | {
              rows: Array<[number | null, number | null]> | undefined;
          }
        | undefined;
};

/**
 * Calls the TagAnalyzer-owned time-boundary utility with the internal
 * sourceTagName-only series shape.
 * @param aSeriesConfigSet The TagAnalyzer series configs passed through to the local utility.
 * @param aBoardTime The board-level time range passed through to the local utility.
 * @param aPanelTime The panel-level time range passed through to the local utility.
 * @returns The normalized time-boundary result.
 */
export async function resolveTagAnalyzerTimeBoundaryRanges<
    T extends {
        table: string;
        sourceTagName: string | undefined;
        colName: SeriesColumns | undefined;
    },
>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<ValueRangePair | undefined> {
    const sTimeRange = await getBgnEndTimeRange(aSeriesConfigSet, aBoardTime, aPanelTime);
    return normalizeLegacyTimeBoundaryRanges(sTimeRange);
}

/**
 * Calls the TagAnalyzer-owned min/max seed query with the internal
 * sourceTagName-only draft shape.
 * @param aSeriesDrafts The TagAnalyzer draft rows passed through to the local repository helper.
 * @param aUserName The current user name passed through to the local repository helper.
 * @returns The repository response for the min/max seed query.
 */
export async function fetchTagAnalyzerMinMaxTable<
    T extends {
        table: string;
        sourceTagName: string | undefined;
        colName: SeriesColumns | undefined;
    },
>(
    aSeriesDrafts: T[],
    aUserName: string,
): Promise<TagAnalyzerMinMaxTableResponse> {
    return (await fetchOnMinMaxTable(aSeriesDrafts, aUserName)) as TagAnalyzerMinMaxTableResponse;
}
