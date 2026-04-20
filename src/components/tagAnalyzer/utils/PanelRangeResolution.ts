import { subtractTime } from '@/utils/bgnEndTimeRange';
import {
    createTagAnalyzerTimeRange,
    normalizePanelTimeRangeSource,
    normalizeResolvedTimeBounds,
    setTimeRange,
} from './TagAnalyzerDateUtils';
import { resolveTagAnalyzerTimeBoundaryRanges } from './getBgnEndTimeRange';
import type {
    ValueRangePair,
    InputTimeBounds,
    PanelData,
    PanelTime,
    TimeRange,
} from './ModelTypes';
import type {
    OptionalTimeRange,
    PanelRangeResolutionParams,
    PanelRangeRuleParams,
} from './TagAnalyzerSharedTypes';
import {
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    toLegacyTimeRangeInput,
} from './TagAnalyzerTimeRangeConfig';

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
                normalizeBoardTimeRange(boardTime),
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
                normalizeBoardTimeRange(boardTime),
            ),
        includeAbsolutePanelRange: undefined,
    });
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

    const sLegacyBoardRange = toLegacyTimeRangeInput(
        {
            range: { min: aTimeBoundaryRanges.start.max, max: aTimeBoundaryRanges.end.max },
            rangeConfig: aBoardTime.value.rangeConfig,
        },
    );

    return createTagAnalyzerTimeRange(
        subtractTime(aTimeBoundaryRanges.end.max, sLegacyBoardRange.bgn as string),
        subtractTime(aTimeBoundaryRanges.end.max, sLegacyBoardRange.end as string),
    );
}

function normalizeEditBoardLastRange(
    aTimeBoundaryRanges: ValueRangePair | undefined,
): OptionalTimeRange {
    if (!aTimeBoundaryRanges) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aTimeBoundaryRanges.start.max, aTimeBoundaryRanges.end.max);
}

function getDefaultBoardRange(
    aBoardTime: InputTimeBounds,
    aPanelTime: PanelTime,
): TimeRange {
    return setTimeRange(
        {
            range: undefined,
            defaultRange: createTagAnalyzerTimeRange(
                aPanelTime.default_range?.min ?? 0,
                aPanelTime.default_range?.max ?? 0,
            ),
        },
        normalizeBoardTimeRange(aBoardTime),
    );
}

function normalizeEditPreviewTimeRange(
    aTimeBoundaryRanges: ValueRangePair | undefined,
): OptionalTimeRange {
    if (!aTimeBoundaryRanges) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aTimeBoundaryRanges.start.min, aTimeBoundaryRanges.end.max);
}

function normalizeAbsolutePanelRange(aPanelTime: PanelTime): OptionalTimeRange {
    if (!isAbsoluteTimeRangeConfig(aPanelTime.range_config)) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aPanelTime.range_bgn, aPanelTime.range_end);
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
        normalizeBoardTimeRange(aBoardTime),
    );
}

function normalizeBoardTimeRange(aBoardTime: InputTimeBounds): OptionalTimeRange {
    if (aBoardTime.kind === 'empty') {
        return undefined;
    }

    return normalizeResolvedTimeBounds(aBoardTime.value);
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

    return createTagAnalyzerTimeRange(
        subtractTime(sTimeRange.end.max, sPanelRangeInput.bgn as string),
        subtractTime(sTimeRange.end.max, sPanelRangeInput.end as string),
    );
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
