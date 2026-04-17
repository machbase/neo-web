import { subtractTime } from '@/utils/bgnEndTimeRange';
import {
    createTagAnalyzerTimeRange,
    normalizePanelTimeRangeSource,
    toConcreteTimeRange,
    setTimeRange,
} from '../utils/TagAnalyzerDateUtils';
import { resolveTagAnalyzerTimeBoundaryRanges } from '../TagAnalyzerUtilCaller';
import type {
    ValueRange,
    ValueRangePair,
    PanelData,
    PanelTime,
    TimeRange,
    TimeRangeConfig,
} from '../common/modelTypes';
import {
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    toLegacyTimeRangeInput,
} from '../utils/TagAnalyzerTimeRangeConfig';

type PanelRangeResolveParams = {
    boardRange: ValueRange | undefined;
    boardRangeConfig?: TimeRangeConfig | undefined;
    panelData: PanelData;
    panelTime: PanelTime;
    timeBoundaryRanges: ValueRangePair | undefined;
    isEdit: boolean;
};

type PanelRangeRuleResolveParams = {
    topLevelRange: TimeRange | undefined;
    boardRange: ValueRange | undefined;
    boardRangeConfig?: TimeRangeConfig | undefined;
    panelData: PanelData;
    panelTime: PanelTime;
    includeAbsolutePanelRange: boolean | undefined;
    fallbackRange: () => TimeRange;
};

/**
 * Resolves the range used when a panel is explicitly reset.
 * @param aParams The board, panel, and mode inputs used to resolve the reset range.
 * @returns The resolved reset range.
 */
export async function resolveResetTimeRange({
    boardRange,
    boardRangeConfig,
    panelData,
    panelTime,
    timeBoundaryRanges,
    isEdit,
}: PanelRangeResolveParams): Promise<TimeRange> {
    if (isEdit) {
        return (
            resolveEditPreviewTimeRange(timeBoundaryRanges) ??
            setTimeRange(
                normalizePanelTimeRangeSource(panelTime),
                getBoardTimeRangeSource(boardRange, boardRangeConfig),
            )
        );
    }

    return resolvePanelRangeFromRules({
        topLevelRange: resolveBoardLastRange(boardRangeConfig, timeBoundaryRanges),
        boardRange,
        boardRangeConfig,
        panelData,
        panelTime,
        includeAbsolutePanelRange: true,
        fallbackRange: () => getDefaultBoardRange(boardRange, boardRangeConfig, panelTime),
    });
}

/**
 * Resolves the first visible range when a panel initializes.
 * @param aParams The board, panel, and mode inputs used to resolve the initial range.
 * @returns The resolved initial panel range.
 */
export async function resolveInitialPanelRange({
    boardRange,
    boardRangeConfig,
    panelData,
    panelTime,
    timeBoundaryRanges,
    isEdit,
}: PanelRangeResolveParams): Promise<TimeRange> {
    return resolvePanelRangeFromRules({
        topLevelRange: isEdit
            ? resolveEditBoardLastRange(timeBoundaryRanges)
            : resolveBoardLastRange(boardRangeConfig, timeBoundaryRanges),
        boardRange,
        boardRangeConfig,
        panelData,
        panelTime,
        fallbackRange: () =>
            setTimeRange(
                normalizePanelTimeRangeSource(panelTime),
                getBoardTimeRangeSource(boardRange, boardRangeConfig),
            ),
        includeAbsolutePanelRange: undefined,
    });
}

function resolveBoardLastRange(
    aBoardRangeConfig: TimeRangeConfig | undefined,
    aTimeBoundaryRanges: ValueRangePair | undefined,
): TimeRange | undefined {
    if (!aTimeBoundaryRanges || !isLastRelativeTimeRangeConfig(aBoardRangeConfig)) {
        return undefined;
    }

    const sLegacyBoardRange = toLegacyTimeRangeInput(
        { min: aTimeBoundaryRanges.start.max, max: aTimeBoundaryRanges.end.max },
        aBoardRangeConfig,
    );

    return createTagAnalyzerTimeRange(
        subtractTime(aTimeBoundaryRanges.end.max, sLegacyBoardRange.bgn as string),
        subtractTime(aTimeBoundaryRanges.end.max, sLegacyBoardRange.end as string),
    );
}

function resolveEditBoardLastRange(
    aTimeBoundaryRanges: ValueRangePair | undefined,
): TimeRange | undefined {
    if (!aTimeBoundaryRanges) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aTimeBoundaryRanges.start.max, aTimeBoundaryRanges.end.max);
}

function getDefaultBoardRange(
    aBoardRange: ValueRange | undefined,
    aBoardRangeConfig: TimeRangeConfig | undefined,
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
        getBoardTimeRangeSource(aBoardRange, aBoardRangeConfig),
    );
}

function resolveEditPreviewTimeRange(
    aTimeBoundaryRanges: ValueRangePair | undefined,
): TimeRange | undefined {
    if (!aTimeBoundaryRanges) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aTimeBoundaryRanges.start.min, aTimeBoundaryRanges.end.max);
}

function getAbsolutePanelRange(aPanelTime: PanelTime): TimeRange | undefined {
    if (!isAbsoluteTimeRangeConfig(aPanelTime.range_config)) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aPanelTime.range_bgn, aPanelTime.range_end);
}

function resolveNowPanelRange(
    aBoardRange: ValueRange | undefined,
    aBoardRangeConfig: TimeRangeConfig | undefined,
    aPanelTime: PanelTime,
): TimeRange | undefined {
    if (!isNowRelativeTimeRangeConfig(aPanelTime.range_config)) {
        return undefined;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        getBoardTimeRangeSource(aBoardRange, aBoardRangeConfig),
    );
}

function getBoardTimeRangeSource(
    aBoardRange: ValueRange | undefined,
    aBoardRangeConfig: TimeRangeConfig | undefined,
): TimeRange | undefined {
    if (aBoardRangeConfig) {
        return toConcreteTimeRange(aBoardRangeConfig);
    }

    if (!aBoardRange) {
        return undefined;
    }

    return toConcreteTimeRange(aBoardRange);
}

async function getRelativePanelLastRange(
    aPanelData: PanelData,
    aBoardRangeConfig: TimeRangeConfig | undefined,
    aPanelTime: PanelTime,
): Promise<TimeRange | undefined> {
    if (
        !isLastRelativeTimeRangeConfig(aPanelTime.range_config) ||
        !isRelativeTimeRangeConfig(aBoardRangeConfig)
    ) {
        return undefined;
    }

    const sBoardRangeInput = toLegacyTimeRangeInput({ min: 0, max: 0 }, aBoardRangeConfig);
    const sPanelRangeInput = toLegacyTimeRangeInput(
        { min: aPanelTime.range_bgn, max: aPanelTime.range_end },
        aPanelTime.range_config,
    );
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
    boardRange,
    boardRangeConfig,
    panelData,
    panelTime,
    includeAbsolutePanelRange = false,
    fallbackRange,
}: PanelRangeRuleResolveParams): Promise<TimeRange> {
    if (topLevelRange) {
        return topLevelRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(
        panelData,
        boardRangeConfig,
        panelTime,
    );
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = resolveNowPanelRange(boardRange, boardRangeConfig, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    if (includeAbsolutePanelRange) {
        const sAbsolutePanelRange = getAbsolutePanelRange(panelTime);
        if (sAbsolutePanelRange) {
            return sAbsolutePanelRange;
        }
    }

    return fallbackRange();
}
