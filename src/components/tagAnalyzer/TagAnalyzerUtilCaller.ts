import { fetchOnMinMaxTable } from '@/api/repository/machiot';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerDefaultRange,
    TagAnalyzerInputRangeValue,
} from './panel/PanelModel';
import { toLegacyTagNameList } from './TagAnalyzerSeriesNaming';

// Used by TagAnalyzer utility callers to type legacy time range input.
type LegacyTimeRangeInput = {
    bgn: TagAnalyzerInputRangeValue;
    end: TagAnalyzerInputRangeValue;
};

// Used by TagAnalyzer utility callers to type source tag name input.
type SourceTagNameInput = {
    sourceTagName: string | undefined;
    [key: string]: unknown;
};

// Used by TagAnalyzer utility callers to type legacy bgn end time range.
type LegacyBgnEndTimeRange = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

/**
 * Calls the shared min/max utility with TagAnalyzer's sourceTagName-only series shape.
 * @param aSeriesConfigSet The TagAnalyzer series configs to translate for the shared utility.
 * @param aBoardTime The board-level time range passed through to the shared utility.
 * @param aPanelTime The panel-level time range passed through to the shared utility.
 * @returns The shared min/max utility result.
 */
export async function callTagAnalyzerBgnEndTimeRange<T extends SourceTagNameInput>(
    aSeriesConfigSet: T[],
    aBoardTime: LegacyTimeRangeInput,
    aPanelTime: LegacyTimeRangeInput,
): Promise<TagAnalyzerBgnEndTimeRange | undefined> {
    const sTimeRange = await getBgnEndTimeRange(
        toLegacyTagNameList(aSeriesConfigSet),
        aBoardTime,
        aPanelTime,
    );
    return normalizeLegacyBgnEndTimeRange(sTimeRange as LegacyBgnEndTimeRange);
}

/**
 * Calls the shared min/max table query with TagAnalyzer's sourceTagName-only draft shape.
 * @param aSeriesDrafts The TagAnalyzer draft rows to translate for the repository call.
 * @param aUserName The current user name passed through to the repository call.
 * @returns The repository response for the min/max seed query.
 */
export async function callTagAnalyzerMinMaxTable<T extends SourceTagNameInput>(
    aSeriesDrafts: T[],
    aUserName: string,
): ReturnType<typeof fetchOnMinMaxTable> {
    return fetchOnMinMaxTable(toLegacyTagNameList(aSeriesDrafts), aUserName);
}

/**
 * Converts the shared flat min/max payload into TagAnalyzer's nested range shape.
 * @param aTimeRange The legacy min/max payload returned by the shared helper.
 * @returns The normalized nested begin/end range payload, or `undefined` when the legacy helper does not yield numeric bounds.
 */
function normalizeLegacyBgnEndTimeRange(
    aTimeRange: LegacyBgnEndTimeRange,
): TagAnalyzerBgnEndTimeRange | undefined {
    const sBgnRange = buildRange(aTimeRange.bgn_min, aTimeRange.bgn_max);
    const sEndRange = buildRange(aTimeRange.end_min, aTimeRange.end_max);
    if (!sBgnRange || !sEndRange) {
        return undefined;
    }

    return {
        bgn: sBgnRange,
        end: sEndRange,
    };
}

/**
 * Normalizes one legacy min/max pair into TagAnalyzer's numeric range shape.
 * @param aMin The potential minimum value from the legacy helper.
 * @param aMax The potential maximum value from the legacy helper.
 * @returns The normalized numeric range, or `undefined` when either side is not numeric.
 */
function buildRange(
    aMin: string | number | undefined,
    aMax: string | number | undefined,
): TagAnalyzerDefaultRange | undefined {
    if (typeof aMin !== 'number' || typeof aMax !== 'number') {
        return undefined;
    }

    return {
        min: aMin,
        max: aMax,
    };
}
