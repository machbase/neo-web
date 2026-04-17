import { fetchOnMinMaxTable } from '@/api/repository/machiot';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import type {
    TagAnalyzerBgnEndTimeRange,
} from './common/CommonTypes';
import {
    normalizeLegacyBgnEndTimeRange,
    toLegacyTagNameList,
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
 * Calls the shared min/max utility with TagAnalyzer's sourceTagName-only series shape.
 * @param aSeriesConfigSet The TagAnalyzer series configs to translate for the shared utility.
 * @param aBoardTime The board-level time range passed through to the shared utility.
 * @param aPanelTime The panel-level time range passed through to the shared utility.
 * @returns The shared min/max utility result.
 */
export async function resolveTagAnalyzerBgnEndTimeRange<
    T extends { sourceTagName: string | undefined },
>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<TagAnalyzerBgnEndTimeRange | undefined> {
    const sTimeRange = await getBgnEndTimeRange(
        toLegacyTagNameList(aSeriesConfigSet),
        aBoardTime,
        aPanelTime,
    );
    return normalizeLegacyBgnEndTimeRange(sTimeRange);
}

/**
 * Calls the shared min/max table query with TagAnalyzer's sourceTagName-only draft shape.
 * @param aSeriesDrafts The TagAnalyzer draft rows to translate for the repository call.
 * @param aUserName The current user name passed through to the repository call.
 * @returns The repository response for the min/max seed query.
 */
export async function fetchTagAnalyzerMinMaxTable<
    T extends { sourceTagName: string | undefined },
>(
    aSeriesDrafts: T[],
    aUserName: string,
): Promise<TagAnalyzerMinMaxTableResponse> {
    return (await fetchOnMinMaxTable(
        toLegacyTagNameList(aSeriesDrafts),
        aUserName,
    )) as TagAnalyzerMinMaxTableResponse;
}
