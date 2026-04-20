import request from '@/api/core';
import { fetchVirtualStatTable } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import { createMinMaxQuery } from '@/utils';
import { subtractTime } from '@/utils/bgnEndTimeRange';
import type {
    InputTimeBounds,
    PanelData,
    PanelTime,
    SeriesColumns,
    TimeRange,
    ValueRangePair,
} from './ModelTypes';
import type {
    OptionalTimeRange,
    PanelRangeResolutionParams,
    PanelRangeRuleParams,
} from './TagAnalyzerSharedTypes';
import {
    normalizeBoardTimeRangeInput,
    normalizePanelTimeRangeSource,
    setTimeRange,
} from './TagAnalyzerTimeRangeUtils';
import {
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    toLegacyTimeRangeInput,
} from './TagAnalyzerTimeRangeConfig';
import { normalizeLegacyTimeBoundaryRanges } from './legacy/LegacyUtils';
import type { LegacyTimeRangeInput } from './legacy/LegacyTypes';

type TagAnalyzerBoundarySeries = {
    table: string;
    sourceTagName: string | undefined;
    colName: SeriesColumns | undefined;
};

type TagAnalyzerTableTagMap = {
    table: string;
    tags: string[];
    cols: SeriesColumns | undefined;
};

export type TagAnalyzerBgnEndTimeRange = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

export type TagAnalyzerMinMaxTableResponse = {
    data:
        | {
              rows: Array<[number | null, number | null]> | undefined;
          }
        | undefined;
};

/**
 * Resolves the range used when a panel is explicitly reset.
 * @param aParams The board, panel, and mode inputs used to resolve the reset range.
 * @returns The resolved reset range.
 */
export async function resolveResetTimeRange({
    boardTime,
    panelData,
    panelTime,
    timeBoundaryRanges,
    isEdit,
}: PanelRangeResolutionParams): Promise<TimeRange> {
    if (isEdit) {
        return (
            normalizeEditPreviewTimeRange(timeBoundaryRanges) ??
            setTimeRange(
                normalizePanelTimeRangeSource(panelTime),
                normalizeBoardTimeRangeInput(boardTime),
            )
        );
    }

    return resolvePanelRangeFromRules({
        topLevelRange: normalizeBoardLastRange(boardTime, timeBoundaryRanges),
        boardTime,
        panelData,
        panelTime,
        includeAbsolutePanelRange: true,
        fallbackRange: () => getDefaultBoardRange(boardTime, panelTime),
    });
}

/**
 * Resolves the first visible range when a panel initializes.
 * @param aParams The board, panel, and mode inputs used to resolve the initial range.
 * @returns The resolved initial panel range.
 */
export async function resolveInitialPanelRange({
    boardTime,
    panelData,
    panelTime,
    timeBoundaryRanges,
    isEdit,
}: PanelRangeResolutionParams): Promise<TimeRange> {
    return resolvePanelRangeFromRules({
        topLevelRange: isEdit
            ? normalizeEditBoardLastRange(timeBoundaryRanges)
            : normalizeBoardLastRange(boardTime, timeBoundaryRanges),
        boardTime,
        panelData,
        panelTime,
        fallbackRange: () =>
            setTimeRange(
                normalizePanelTimeRangeSource(panelTime),
                normalizeBoardTimeRangeInput(boardTime),
            ),
        includeAbsolutePanelRange: undefined,
    });
}

/**
 * Queries the min/max seed table for TagAnalyzer series using sourceTagName directly.
 * @param aTableTagInfo The TagAnalyzer series configs to query.
 * @param aUserName The current user name used by the query builder.
 * @returns The repository response for the min/max seed query.
 */
export async function fetchTagAnalyzerMinMaxTable<T extends TagAnalyzerBoundarySeries>(
    aTableTagInfo: T[],
    aUserName: string,
): Promise<TagAnalyzerMinMaxTableResponse> {
    const sTableTagMap = createTagAnalyzerTableTagMap(aTableTagInfo);
    const sQuery = createMinMaxQuery(sTableTagMap, aUserName);
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sQuery)}`,
    });

    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }

    return sData as TagAnalyzerMinMaxTableResponse;
}

/**
 * Resolves TagAnalyzer time boundaries directly from sourceTagName-based series configs.
 * @param aSeriesConfigSet The TagAnalyzer series configs used to resolve the bounds.
 * @param aBoardTime The board-level time range.
 * @param aPanelTime The panel-level time range override.
 * @returns The normalized numeric time-boundary ranges for TagAnalyzer.
 */
export async function resolveTagAnalyzerTimeBoundaryRanges<T extends TagAnalyzerBoundarySeries>(
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

function normalizeBoardLastRange(
    aBoardTime: InputTimeBounds,
    aTimeBoundaryRanges: ValueRangePair | undefined,
): OptionalTimeRange {
    if (
        aBoardTime.kind !== 'resolved' ||
        !aTimeBoundaryRanges ||
        !isLastRelativeTimeRangeConfig(aBoardTime.value.rangeConfig)
    ) {
        return undefined;
    }

    const sLegacyBoardRange = toLegacyTimeRangeInput({
        range: { min: aTimeBoundaryRanges.start.max, max: aTimeBoundaryRanges.end.max },
        rangeConfig: aBoardTime.value.rangeConfig,
    });

    return {
        startTime: subtractTime(aTimeBoundaryRanges.end.max, sLegacyBoardRange.bgn as string),
        endTime: subtractTime(aTimeBoundaryRanges.end.max, sLegacyBoardRange.end as string),
    };
}

function normalizeEditBoardLastRange(
    aTimeBoundaryRanges: ValueRangePair | undefined,
): OptionalTimeRange {
    if (!aTimeBoundaryRanges) {
        return undefined;
    }

    return {
        startTime: aTimeBoundaryRanges.start.max,
        endTime: aTimeBoundaryRanges.end.max,
    };
}

function getDefaultBoardRange(
    aBoardTime: InputTimeBounds,
    aPanelTime: PanelTime,
): TimeRange {
    return setTimeRange(
        {
            range: undefined,
            defaultRange: {
                startTime: aPanelTime.default_range?.min ?? 0,
                endTime: aPanelTime.default_range?.max ?? 0,
            },
        },
        normalizeBoardTimeRangeInput(aBoardTime),
    );
}

function normalizeEditPreviewTimeRange(
    aTimeBoundaryRanges: ValueRangePair | undefined,
): OptionalTimeRange {
    if (!aTimeBoundaryRanges) {
        return undefined;
    }

    return {
        startTime: aTimeBoundaryRanges.start.min,
        endTime: aTimeBoundaryRanges.end.max,
    };
}

function normalizeAbsolutePanelRange(aPanelTime: PanelTime): OptionalTimeRange {
    if (!isAbsoluteTimeRangeConfig(aPanelTime.range_config)) {
        return undefined;
    }

    return {
        startTime: aPanelTime.range_bgn,
        endTime: aPanelTime.range_end,
    };
}

function normalizeNowPanelRange(
    aBoardTime: InputTimeBounds,
    aPanelTime: PanelTime,
): OptionalTimeRange {
    if (!isNowRelativeTimeRangeConfig(aPanelTime.range_config)) {
        return undefined;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        normalizeBoardTimeRangeInput(aBoardTime),
    );
}

async function getRelativePanelLastRange(
    aPanelData: PanelData,
    aBoardTime: InputTimeBounds,
    aPanelTime: PanelTime,
): Promise<OptionalTimeRange> {
    if (
        aBoardTime.kind !== 'resolved' ||
        !isLastRelativeTimeRangeConfig(aPanelTime.range_config) ||
        !isRelativeTimeRangeConfig(aBoardTime.value.rangeConfig)
    ) {
        return undefined;
    }

    const sBoardRangeInput = toLegacyTimeRangeInput({
        range: { min: 0, max: 0 },
        rangeConfig: aBoardTime.value.rangeConfig,
    });
    const sPanelRangeInput = toLegacyTimeRangeInput({
        range: { min: aPanelTime.range_bgn, max: aPanelTime.range_end },
        rangeConfig: aPanelTime.range_config,
    });
    const sTimeRange = await resolveTagAnalyzerTimeBoundaryRanges(
        aPanelData.tag_set,
        sBoardRangeInput,
        sPanelRangeInput,
    );
    if (!sTimeRange) {
        return undefined;
    }

    return {
        startTime: subtractTime(sTimeRange.end.max, sPanelRangeInput.bgn as string),
        endTime: subtractTime(sTimeRange.end.max, sPanelRangeInput.end as string),
    };
}

async function resolvePanelRangeFromRules({
    topLevelRange,
    boardTime,
    panelData,
    panelTime,
    includeAbsolutePanelRange = false,
    fallbackRange,
}: PanelRangeRuleParams): Promise<TimeRange> {
    if (topLevelRange) {
        return topLevelRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(panelData, boardTime, panelTime);
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = normalizeNowPanelRange(boardTime, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    if (includeAbsolutePanelRange) {
        const sAbsolutePanelRange = normalizeAbsolutePanelRange(panelTime);
        if (sAbsolutePanelRange) {
            return sAbsolutePanelRange;
        }
    }

    return fallbackRange();
}

function createTagAnalyzerTableTagMap<T extends TagAnalyzerBoundarySeries>(
    aTableTagInfo: T[],
): TagAnalyzerTableTagMap[] {
    const sMap: Record<
        string,
        {
            tags: string[];
            cols: SeriesColumns | undefined;
        }
    > = {};

    aTableTagInfo.forEach((aInfo) => {
        const sExistingEntry = sMap[aInfo.table];
        const sTagName = aInfo.sourceTagName || '';

        if (sExistingEntry) {
            sExistingEntry.tags.push(sTagName);
            return;
        }

        sMap[aInfo.table] = {
            tags: [sTagName],
            cols: aInfo.colName,
        };
    });

    return Object.keys(sMap).map((aTable) => ({
        table: aTable,
        tags: sMap[aTable].tags,
        cols: sMap[aTable].cols,
    }));
}

async function getTagAnalyzerBgnEndTimeRange<T extends TagAnalyzerBoundarySeries>(
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
