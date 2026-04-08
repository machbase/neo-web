import { fetchOnMinMaxTable } from '@/api/repository/machiot';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import type { TagAnalyzerRangeValue } from './panel/TagAnalyzerPanelModelTypes';
import { toLegacyTagNameList } from './TagAnalyzerSeriesNaming';

type LegacyTimeRangeInput = {
    bgn: TagAnalyzerRangeValue;
    end: TagAnalyzerRangeValue;
};

type SourceTagNameInput = {
    sourceTagName?: string;
    [key: string]: unknown;
};

/**
 * Calls the shared min/max utility with TagAnalyzer's sourceTagName-only series shape.
 * @param aSeriesConfigSet The TagAnalyzer series configs to translate for the shared utility.
 * @param aBoardTime The board-level time range passed through to the shared utility.
 * @param aPanelTime The panel-level time range passed through to the shared utility.
 * @returns The shared min/max utility result.
 */
export const callTagAnalyzerBgnEndTimeRange = async <T extends SourceTagNameInput>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
) => {
    return getBgnEndTimeRange(toLegacyTagNameList(aSeriesConfigSet), aBoardTime, aPanelTime);
};

/**
 * Calls the shared min/max table query with TagAnalyzer's sourceTagName-only draft shape.
 * @param aSeriesDrafts The TagAnalyzer draft rows to translate for the repository call.
 * @param aUserName The current user name passed through to the repository call.
 * @returns The repository response for the min/max seed query.
 */
export const callTagAnalyzerMinMaxTable = async <T extends SourceTagNameInput>(aSeriesDrafts: T[], aUserName: string) => {
    return fetchOnMinMaxTable(toLegacyTagNameList(aSeriesDrafts), aUserName);
};
