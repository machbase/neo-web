import type { PanelData, PanelTime } from '../panelModelTypes';
import { toLegacyTimeRangeInput } from '../legacy/LegacyTimeAdapter';
import { resolveLastRelativeTimeRange } from './RelativeTimeUtils';
import { resolveTimeBoundaryRanges } from './TimeBoundaryRangeResolver';
import type {
    ConcreteTimeRangeSource,
    InputTimeBounds,
    OptionalTimeRange,
    PanelRangeResolutionMode,
    PanelRangeResolutionParams,
    PanelRangeRuleParams,
    PanelTimeRangeResolutionParams,
    RestoredTimeRangePairResult,
    PanelTimeRangeSource,
    TimeRange,
    TimeRangePair,
    ValueRangePair,
    ResolvedTimeBounds,
    TimeBoundary,
    TimeRangeConfig,
    ValueRange,
} from './timeTypes';
import {
    isEmptyTimeBoundary,
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isLastRelativeTimeBoundary,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    resolveTimeBoundaryValue,
} from './TimeBoundaryParsing';

export const EMPTY_TIME_RANGE: TimeRange = { startTime: 0, endTime: 0 };

/**
 * Resolves the active panel time range for the current mode and inputs.
 * Intent: Centralize the panel range decision tree for edit, reset, and initialize flows.
 * @param {PanelTimeRangeResolutionParams} aParams - The parameters that describe the current time-range state.
 * @returns {Promise<TimeRange>} The resolved panel time range.
 */
export async function resolvePanelTimeRange(
    aParams: PanelTimeRangeResolutionParams,
): Promise<TimeRange> {
    const sEditRange = resolveEditModeRange(
        aParams.mode,
        aParams.timeBoundaryRanges,
        aParams.boardTime,
        aParams.panelTime,
    );
    if (aParams.isEdit && sEditRange) {
        return sEditRange;
    }

    return resolvePanelRangeFromRules({
        topLevelRange: resolveTopLevelRange(
            aParams.mode,
            aParams.isEdit,
            aParams.boardTime,
            aParams.timeBoundaryRanges,
        ),
        boardTime: aParams.boardTime,
        panelData: aParams.panelData,
        panelTime: aParams.panelTime,
        includeAbsolutePanelRange: shouldIncludeAbsolutePanelRange(aParams.mode, aParams.isEdit),
        fallbackRange: () =>
            resolveFallbackRange(aParams.mode, aParams.isEdit, aParams.boardTime, aParams.panelTime),
    });
}

/**
 * Resolves the panel time range for a reset action.
 * Intent: Reuse the shared panel range resolver with reset mode forced.
 * @param {PanelRangeResolutionParams} aParams - The parameters for the reset flow.
 * @returns {Promise<TimeRange>} The resolved reset range.
 */
export async function resolveResetTimeRange(
    aParams: PanelRangeResolutionParams,
): Promise<TimeRange> {
    return resolvePanelTimeRange({
        ...aParams,
        mode: 'reset',
    });
}

/**
 * Resolves the panel time range for an initial load action.
 * Intent: Reuse the shared panel range resolver with initialize mode forced.
 * @param {PanelRangeResolutionParams} aParams - The parameters for the initial load flow.
 * @returns {Promise<TimeRange>} The resolved initial panel range.
 */
export async function resolveInitialPanelRange(
    aParams: PanelRangeResolutionParams,
): Promise<TimeRange> {
    return resolvePanelTimeRange({
        ...aParams,
        mode: 'initialize',
    });
}

/**
 * Normalizes optional range input into the input bounds union.
 * Intent: Simplify callers that need a concrete or empty time-bounds wrapper.
 * @param {ValueRange | undefined} aRange - The optional resolved range.
 * @param {TimeRangeConfig | undefined} aRangeConfig - The optional range configuration.
 * @returns {InputTimeBounds} The normalized input bounds value.
 */
export function normalizeTimeBoundsInput(
    aRange: ValueRange | undefined,
    aRangeConfig: TimeRangeConfig | undefined,
): InputTimeBounds {
    if (!aRange || !aRangeConfig) {
        return { kind: 'empty' };
    }

    return {
        kind: 'resolved',
        value: {
            range: aRange,
            rangeConfig: aRangeConfig,
        },
    };
}

/**
 * Compares two time ranges for exact equality.
 * Intent: Provide a simple equality check for resolved panel and navigator ranges.
 * @param {TimeRange} aLeft - The first range to compare.
 * @param {TimeRange} aRight - The second range to compare.
 * @returns {boolean} True when both ranges have the same start and end times.
 */
export function isSameTimeRange(aLeft: TimeRange, aRight: TimeRange): boolean {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
}

/**
 * Converts a concrete range source into an optional time range.
 * Intent: Normalize both legacy boundary configs and direct min/max ranges into one shape.
 * @param {ConcreteTimeRangeSource} aRange - The source range to convert.
 * @returns {OptionalTimeRange} The concrete time range, or undefined when the source is incomplete.
 */
export function toConcreteTimeRange(
    aRange: ConcreteTimeRangeSource,
): OptionalTimeRange {
    if ('min' in aRange && 'max' in aRange) {
        return { startTime: aRange.min, endTime: aRange.max };
    }

    return buildConcreteTimeRange(aRange.start, aRange.end);
}

/**
 * Normalizes resolved time bounds into a concrete optional range.
 * Intent: Prefer the explicit config first and only fall back to numeric range values when valid.
 * @param {ResolvedTimeBounds} aTimeBounds - The resolved bounds to normalize.
 * @returns {OptionalTimeRange} The normalized time range, or undefined when the bounds are invalid.
 */
export function normalizeResolvedTimeBounds(
    aTimeBounds: ResolvedTimeBounds,
): OptionalTimeRange {
    const sConcreteRange = toConcreteTimeRange(aTimeBounds.rangeConfig);
    if (sConcreteRange) {
        return sConcreteRange;
    }

    if (
        aTimeBounds.range.min <= 0 ||
        aTimeBounds.range.max <= 0 ||
        aTimeBounds.range.max < aTimeBounds.range.min
    ) {
        return undefined;
    }

    return {
        startTime: aTimeBounds.range.min,
        endTime: aTimeBounds.range.max,
    };
}

/**
 * Normalizes board time input into a concrete optional range.
 * Intent: Keep board-time handling aligned with the resolved input-bounds wrapper.
 * @param {InputTimeBounds} aBoardTime - The board time bounds to normalize.
 * @returns {OptionalTimeRange} The normalized board range, or undefined when no range exists.
 */
export function normalizeBoardTimeRangeInput(
    aBoardTime: InputTimeBounds,
): OptionalTimeRange {
    if (aBoardTime.kind === 'empty') {
        return undefined;
    }

    return normalizeResolvedTimeBounds(aBoardTime.value);
}

/**
 * Normalizes the panel time payload into a range source.
 * Intent: Expose panel range and default range values in the same internal shape.
 * @param {{ range_bgn: number; range_end: number; range_config: TimeRangeConfig; default_range: ValueRange | undefined; }} aPanelTime - The raw panel time payload.
 * @returns {PanelTimeRangeSource} The normalized panel time range source.
 */
export function normalizePanelTimeRangeSource(
    aPanelTime: {
        range_bgn: number;
        range_end: number;
        range_config: TimeRangeConfig;
        default_range: ValueRange | undefined;
    },
): PanelTimeRangeSource {
    const sDefaultRange = aPanelTime.default_range;

    return {
        range: toConcreteTimeRange(aPanelTime.range_config),
        defaultRange: sDefaultRange
            ? {
                  startTime: sDefaultRange.min,
                  endTime: sDefaultRange.max,
              }
            : EMPTY_TIME_RANGE,
    };
}

/**
 * Selects the active time range from the panel, board, or default source.
 * Intent: Share the fallback order used by the panel and board time resolution paths.
 * @param {PanelTimeRangeSource} aPanelRangeSource - The normalized panel range source.
 * @param {OptionalTimeRange} aBoardRangeSource - The normalized board range source.
 * @returns {TimeRange} The selected time range.
 */
export function setTimeRange(
    aPanelRangeSource: PanelTimeRangeSource,
    aBoardRangeSource: OptionalTimeRange,
): TimeRange {
    const sResolvedRangeSource = aPanelRangeSource.range ?? aBoardRangeSource;
    if (!sResolvedRangeSource) {
        return aPanelRangeSource.defaultRange;
    }

    return sResolvedRangeSource;
}

/**
 * Restores a saved time-range pair when both ranges are complete.
 * Intent: Validate persisted panel state before reusing the saved ranges.
 * @param {Partial<TimeRangePair> | undefined} aTimeKeeper - The saved range pair payload.
 * @returns {RestoredTimeRangePairResult} The restored pair result.
 */
export function restoreTimeRangePair(
    aTimeKeeper: Partial<TimeRangePair> | undefined,
): RestoredTimeRangePairResult {
    const sPanelRange = aTimeKeeper?.panelRange;
    const sNavigatorRange = aTimeKeeper?.navigatorRange;

    if (!sPanelRange || !sNavigatorRange) {
        return { kind: 'empty' };
    }

    if (!isCompleteTimeRange(sPanelRange) || !isCompleteTimeRange(sNavigatorRange)) {
        return { kind: 'empty' };
    }

    return {
        kind: 'resolved',
        value: {
            panelRange: sPanelRange,
            navigatorRange: sNavigatorRange,
        },
    };
}

/**
 * Chooses the final global time range target.
 * Intent: Prefer the pre-overflow range when it is available, otherwise use the panel range.
 * @param {TimeRange} aPreOverflowRange - The range before overflow handling.
 * @param {TimeRange} aPanelRange - The current panel range.
 * @returns {TimeRange} The resolved global target range.
 */
export function resolveGlobalTimeTargetRange(
    aPreOverflowRange: TimeRange,
    aPanelRange: TimeRange,
): TimeRange {
    if (aPreOverflowRange.startTime && aPreOverflowRange.endTime) {
        return aPreOverflowRange;
    }

    return aPanelRange;
}

/**
 * Resolves the edit-mode range candidate.
 * Intent: Keep edit mode on the last fetched bounds or on the current panel and board values.
 * @param {PanelRangeResolutionMode} aMode - The current resolution mode.
 * @param {ValueRangePair | undefined} aTimeBoundaryRanges - The fetched boundary ranges.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {PanelTime} aPanelTime - The panel time payload.
 * @returns {OptionalTimeRange} The edit-mode range, or undefined when no edit-specific range applies.
 */
function resolveEditModeRange(
    aMode: PanelRangeResolutionMode,
    aTimeBoundaryRanges: ValueRangePair | undefined,
    aBoardTime: InputTimeBounds,
    aPanelTime: PanelTime,
): OptionalTimeRange {
    if (aMode === 'initialize') {
        return normalizeEditBoardLastRange(aTimeBoundaryRanges);
    }

    return (
        normalizeEditPreviewTimeRange(aTimeBoundaryRanges) ??
        setTimeRange(
            normalizePanelTimeRangeSource(aPanelTime),
            normalizeBoardTimeRangeInput(aBoardTime),
        )
    );
}

/**
 * Resolves the top-level range candidate for the current mode.
 * Intent: Apply the edit and initialize precedence rules before deeper range resolution.
 * @param {PanelRangeResolutionMode} aMode - The current resolution mode.
 * @param {boolean} aIsEdit - Whether the current flow is edit mode.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {ValueRangePair | undefined} aTimeBoundaryRanges - The fetched boundary ranges.
 * @returns {OptionalTimeRange} The top-level range candidate, or undefined when none applies.
 */
function resolveTopLevelRange(
    aMode: PanelRangeResolutionMode,
    aIsEdit: boolean,
    aBoardTime: InputTimeBounds,
    aTimeBoundaryRanges: ValueRangePair | undefined,
): OptionalTimeRange {
    if (aIsEdit) {
        return aMode === 'initialize'
            ? normalizeEditBoardLastRange(aTimeBoundaryRanges)
            : undefined;
    }

    return normalizeBoardLastRange(aBoardTime, aTimeBoundaryRanges);
}

/**
 * Resolves the fallback range when no higher-priority rule applies.
 * Intent: Provide the last safety net for panel range resolution.
 * @param {PanelRangeResolutionMode} aMode - The current resolution mode.
 * @param {boolean} aIsEdit - Whether the current flow is edit mode.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {PanelTime} aPanelTime - The panel time payload.
 * @returns {TimeRange} The fallback time range.
 */
function resolveFallbackRange(
    aMode: PanelRangeResolutionMode,
    aIsEdit: boolean,
    aBoardTime: InputTimeBounds,
    aPanelTime: PanelTime,
): TimeRange {
    if (aIsEdit || aMode === 'initialize') {
        return setTimeRange(
            normalizePanelTimeRangeSource(aPanelTime),
            normalizeBoardTimeRangeInput(aBoardTime),
        );
    }

    return getDefaultBoardRange(aBoardTime, aPanelTime);
}

/**
 * Decides whether the absolute panel range should be considered.
 * Intent: Limit absolute panel range handling to the reset flow in non-edit mode.
 * @param {PanelRangeResolutionMode} aMode - The current resolution mode.
 * @param {boolean} aIsEdit - Whether the current flow is edit mode.
 * @returns {boolean | undefined} True when the absolute range should be included, otherwise undefined.
 */
function shouldIncludeAbsolutePanelRange(
    aMode: PanelRangeResolutionMode,
    aIsEdit: boolean,
): boolean | undefined {
    return !aIsEdit && aMode === 'reset' ? true : undefined;
}

/**
 * Normalizes the board's last-relative range into concrete values.
 * Intent: Resolve board-relative last ranges against the fetched boundary ranges.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {ValueRangePair | undefined} aTimeBoundaryRanges - The fetched boundary ranges.
 * @returns {OptionalTimeRange} The normalized board last range, or undefined when it cannot be resolved.
 */
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

    return resolveLastRelativeTimeRange(aTimeBoundaryRanges.end.max, aBoardTime.value.rangeConfig);
}

/**
 * Normalizes the edit board's last fetched range into a concrete range.
 * Intent: Preserve the last known board bounds during edit initialization.
 * @param {ValueRangePair | undefined} aTimeBoundaryRanges - The fetched boundary ranges.
 * @returns {OptionalTimeRange} The normalized edit board last range, or undefined when missing.
 */
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

/**
 * Builds the default board range from panel defaults and board input.
 * Intent: Provide a stable final fallback when no explicit board range is available.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {PanelTime} aPanelTime - The panel time payload.
 * @returns {TimeRange} The default board range.
 */
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

/**
 * Normalizes the edit preview range into a concrete optional range.
 * Intent: Preserve the fetched edit preview values when they are available.
 * @param {ValueRangePair | undefined} aTimeBoundaryRanges - The fetched boundary ranges.
 * @returns {OptionalTimeRange} The normalized preview range, or undefined when unavailable.
 */
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

/**
 * Normalizes an absolute panel range into a concrete optional range.
 * Intent: Use the panel's explicit absolute values when the configuration is absolute.
 * @param {PanelTime} aPanelTime - The panel time payload.
 * @returns {OptionalTimeRange} The absolute panel range, or undefined when the config is not absolute.
 */
function normalizeAbsolutePanelRange(aPanelTime: PanelTime): OptionalTimeRange {
    if (!isAbsoluteTimeRangeConfig(aPanelTime.range_config)) {
        return undefined;
    }

    return {
        startTime: aPanelTime.range_bgn,
        endTime: aPanelTime.range_end,
    };
}

/**
 * Normalizes a now-relative panel range through the shared time source selection.
 * Intent: Resolve now-based panel ranges from the panel, board, or default source consistently.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {PanelTime} aPanelTime - The panel time payload.
 * @returns {OptionalTimeRange} The now-relative panel range, or undefined when the config is not now-relative.
 */
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

/**
 * Resolves a relative last-based panel range from fetched tag time boundaries.
 * Intent: Use virtual stats to translate panel-relative last ranges into concrete timestamps.
 * @param {PanelData} aPanelData - The panel data payload.
 * @param {InputTimeBounds} aBoardTime - The board time input.
 * @param {PanelTime} aPanelTime - The panel time payload.
 * @returns {Promise<OptionalTimeRange>} The resolved relative panel range, or undefined when it cannot be derived.
 */
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
    const sTimeRange = await resolveTimeBoundaryRanges(
        aPanelData.tag_set,
        sBoardRangeInput,
        sPanelRangeInput,
    );
    if (!sTimeRange) {
        return undefined;
    }

    return resolveLastRelativeTimeRange(sTimeRange.end.max, aPanelTime.range_config);
}

/**
 * Resolves the final panel range by applying the rule chain in priority order.
 * Intent: Keep the range resolution precedence in one place for easier maintenance.
 * @param {PanelRangeRuleParams} params - The rule parameters for the panel range resolution.
 * @returns {Promise<TimeRange>} The resolved panel range.
 */
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

/**
 * Builds a concrete optional time range from structured boundaries.
 * Intent: Reject empty and last-relative boundaries before converting to timestamps.
 * @param {TimeBoundary} aStartValue - The start boundary to resolve.
 * @param {TimeBoundary} aEndValue - The end boundary to resolve.
 * @returns {OptionalTimeRange} The concrete range, or undefined when the inputs are incomplete.
 */
function buildConcreteTimeRange(
    aStartValue: TimeBoundary,
    aEndValue: TimeBoundary,
): OptionalTimeRange {
    if (isEmptyTimeBoundary(aStartValue) || isEmptyTimeBoundary(aEndValue)) {
        return undefined;
    }

    if (isLastRelativeTimeBoundary(aStartValue) || isLastRelativeTimeBoundary(aEndValue)) {
        return undefined;
    }

    return {
        startTime: resolveTimeBoundaryValue(aStartValue),
        endTime: resolveTimeBoundaryValue(aEndValue),
    };
}

/**
 * Checks whether a partial time range has both start and end values.
 * Intent: Validate restored time-range pairs before reusing them.
 * @param {Partial<TimeRange>} aRange - The partial range to inspect.
 * @returns {aRange is TimeRange} True when both range values are present.
 */
function isCompleteTimeRange(aRange: Partial<TimeRange>): aRange is TimeRange {
    return aRange.startTime !== undefined && aRange.endTime !== undefined;
}
