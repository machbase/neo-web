import type { PanelData, PanelTime } from '../panelModelTypes';
import type { ValueRange, ValueRangePair } from '../../TagAnalyzerCommonTypes';
import { toStoredTimeRangeInput } from './StoredTimeRangeAdapter';
import { EMPTY_TIME_RANGE } from './constants/TimeRangeConstants';
import { resolveLastRelativeTimeRange } from './RelativeTimeUtils';
import { resolveTimeBoundaryRanges } from './TimeBoundaryRangeResolver';
import type {
    ConcreteTimeRangeSource,
    InputTimeBounds,
    PanelRangeResolutionMode,
    RestoredTimeRangePairResult,
    PanelTimeRangeSource,
    TimeRangeMs,
    TimeRangePair,
    ResolvedTimeBounds,
    TimeBoundary,
    TimeRangeConfig,
} from './types/TimeTypes';
import {
    isConcreteTimeRange,
    isEmptyTimeBoundary,
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isLastRelativeTimeBoundary,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    resolveTimeBoundaryValue,
} from './TimeBoundaryParsing';

/**
 * Resolves the active panel time range for the current mode and inputs.
 * Intent: Centralize the panel range decision tree for edit, reset, and initialize flows.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelData} panelData - The panel data payload.
 * @param {PanelTime} panelTime - The panel time payload.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched time boundary ranges.
 * @param {boolean} isEdit - Whether the current flow is edit mode.
 * @param {PanelRangeResolutionMode} mode - The current resolution mode.
 * @returns {Promise<TimeRangeMs>} The resolved panel time range.
 */
export async function resolvePanelTimeRange(
    boardTime: InputTimeBounds,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: ValueRangePair | null,
    isEdit: boolean,
    mode: PanelRangeResolutionMode,
): Promise<TimeRangeMs> {
    const sEditRange = resolveEditModeRange(
        mode,
        timeBoundaryRanges,
        boardTime,
        panelTime,
    );
    if (isEdit && sEditRange) {
        return sEditRange;
    }

    return resolvePanelRangeFromRules(
        resolveTopLevelRange(
            mode,
            isEdit,
            boardTime,
            timeBoundaryRanges,
        ),
        boardTime,
        panelData,
        panelTime,
        shouldIncludeAbsolutePanelRange(mode, isEdit),
        () =>
            resolveFallbackRange(
                mode,
                isEdit,
                boardTime,
                panelTime,
                timeBoundaryRanges,
            ),
    );
}

/**
 * Resolves the panel time range for a reset action.
 * Intent: Reuse the shared panel range resolver with reset mode forced.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelData} panelData - The panel data payload.
 * @param {PanelTime} panelTime - The panel time payload.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched time boundary ranges.
 * @param {boolean} isEdit - Whether the current flow is edit mode.
 * @returns {Promise<TimeRangeMs>} The resolved reset range.
 */
export async function resolveResetTimeRange(
    boardTime: InputTimeBounds,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: ValueRangePair | null,
    isEdit: boolean,
): Promise<TimeRangeMs> {
    return resolvePanelTimeRange(
        boardTime,
        panelData,
        panelTime,
        timeBoundaryRanges,
        isEdit,
        'reset',
    );
}

/**
 * Resolves the panel time range for an initial load action.
 * Intent: Reuse the shared panel range resolver with initialize mode forced.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelData} panelData - The panel data payload.
 * @param {PanelTime} panelTime - The panel time payload.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched time boundary ranges.
 * @param {boolean} isEdit - Whether the current flow is edit mode.
 * @returns {Promise<TimeRangeMs>} The resolved initial panel range.
 */
export async function resolveInitialPanelRange(
    boardTime: InputTimeBounds,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: ValueRangePair | null,
    isEdit: boolean,
): Promise<TimeRangeMs> {
    return resolvePanelTimeRange(
        boardTime,
        panelData,
        panelTime,
        timeBoundaryRanges,
        isEdit,
        'initialize',
    );
}

/**
 * Normalizes optional range input into the input bounds union.
 * Intent: Simplify callers that need a concrete or empty time-bounds wrapper.
 * @param {ValueRange | undefined} range - The optional resolved range.
 * @param {TimeRangeConfig | undefined} rangeConfig - The optional range configuration.
 * @returns {InputTimeBounds} The normalized input bounds value.
 */
export function normalizeTimeBoundsInput(
    range: ValueRange | undefined,
    rangeConfig: TimeRangeConfig | undefined,
): InputTimeBounds {
    if (!range || !rangeConfig) {
        return { kind: 'empty' };
    }

    return {
        kind: 'resolved',
        value: {
            range: range,
            rangeConfig: rangeConfig,
        },
    };
}

/**
 * Compares two time ranges for exact equality.
 * Intent: Provide a simple equality check for resolved panel and navigator ranges.
 * @param {TimeRangeMs} left - The first range to compare.
 * @param {TimeRangeMs} right - The second range to compare.
 * @returns {boolean} True when both ranges have the same start and end times.
 */
export function isSameTimeRange(left: TimeRangeMs, right: TimeRangeMs): boolean {
    return left.startTime === right.startTime && left.endTime === right.endTime;
}

/**
 * Converts a concrete range source into an optional time range.
 * Intent: Normalize both legacy boundary configs and direct min/max ranges into one shape.
 * @param {ConcreteTimeRangeSource} range - The source range to convert.
 * @returns {TimeRangeMs | undefined} The concrete time range, or undefined when the source is incomplete.
 */
export function toConcreteTimeRange(
    range: ConcreteTimeRangeSource,
): TimeRangeMs | undefined {
    if ('min' in range && 'max' in range) {
        return { startTime: range.min, endTime: range.max };
    }

    return buildConcreteTimeRange(range.start, range.end);
}

/**
 * Normalizes resolved time bounds into a concrete optional range.
 * Intent: Prefer the explicit config first and only fall back to numeric range values when valid.
 * @param {ResolvedTimeBounds} timeBounds - The resolved bounds to normalize.
 * @returns {TimeRangeMs | undefined} The normalized time range, or undefined when the bounds are invalid.
 */
export function normalizeResolvedTimeBounds(
    timeBounds: ResolvedTimeBounds,
): TimeRangeMs | undefined {
    const sConcreteRange = toConcreteTimeRange(timeBounds.rangeConfig);
    if (sConcreteRange) {
        return sConcreteRange;
    }

    if (
        timeBounds.range.min <= 0 ||
        timeBounds.range.max <= 0 ||
        timeBounds.range.max < timeBounds.range.min
    ) {
        return undefined;
    }

    return {
        startTime: timeBounds.range.min,
        endTime: timeBounds.range.max,
    };
}

/**
 * Normalizes board time input into a concrete optional range.
 * Intent: Keep board-time handling aligned with the resolved input-bounds wrapper.
 * @param {InputTimeBounds} boardTime - The board time bounds to normalize.
 * @returns {TimeRangeMs | undefined} The normalized board range, or undefined when no range exists.
 */
export function normalizeBoardTimeRangeInput(
    boardTime: InputTimeBounds,
): TimeRangeMs | undefined {
    if (boardTime.kind === 'empty') {
        return undefined;
    }

    return normalizeResolvedTimeBounds(boardTime.value);
}

/**
 * Normalizes the panel time payload into a range source.
 * Intent: Expose panel range and default range values in the same internal shape.
 * @param {{ range_bgn: number; range_end: number; range_config: TimeRangeConfig; default_range: ValueRange | undefined; }} panelTime - The raw panel time payload.
 * @returns {PanelTimeRangeSource} The normalized panel time range source.
 */
export function normalizePanelTimeRangeSource(
    panelTime: {
        range_bgn: number;
        range_end: number;
        range_config: TimeRangeConfig;
        default_range: ValueRange | undefined;
    },
): PanelTimeRangeSource {
    const sDefaultRange = panelTime.default_range;

    return {
        range: toConcreteTimeRange(panelTime.range_config),
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
 * @param {PanelTimeRangeSource} panelRangeSource - The normalized panel range source.
 * @param {TimeRangeMs | undefined} boardRangeSource - The normalized board range source.
 * @returns {TimeRangeMs} The selected time range.
 */
export function setTimeRange(
    panelRangeSource: PanelTimeRangeSource,
    boardRangeSource: TimeRangeMs | undefined,
): TimeRangeMs {
    const sResolvedRangeSource = panelRangeSource.range ?? boardRangeSource;
    if (!sResolvedRangeSource) {
        return panelRangeSource.defaultRange;
    }

    return sResolvedRangeSource;
}

/**
 * Restores a saved time-range pair when both ranges are complete.
 * Intent: Validate persisted panel state before reusing the saved ranges.
 * @param {Partial<TimeRangePair> | undefined} timeKeeper - The saved range pair payload.
 * @returns {RestoredTimeRangePairResult} The restored pair result.
 */
export function restoreTimeRangePair(
    timeKeeper: Partial<TimeRangePair> | undefined,
): RestoredTimeRangePairResult {
    const sPanelRange = timeKeeper?.panelRange;
    const sNavigatorRange = timeKeeper?.navigatorRange;

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
 * @param {TimeRangeMs} preOverflowRange - The range before overflow handling.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @returns {TimeRangeMs} The resolved global target range.
 */
export function resolveGlobalTimeTargetRange(
    preOverflowRange: TimeRangeMs,
    panelRange: TimeRangeMs,
): TimeRangeMs {
    if (preOverflowRange.startTime && preOverflowRange.endTime) {
        return preOverflowRange;
    }

    return panelRange;
}

/**
 * Resolves the edit-mode range candidate.
 * Intent: Keep edit mode on the last fetched bounds or on the current panel and board values.
 * @param {PanelRangeResolutionMode} mode - The current resolution mode.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched boundary ranges.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {TimeRangeMs | undefined} The edit-mode range, or undefined when no edit-specific range applies.
 */
function resolveEditModeRange(
    mode: PanelRangeResolutionMode,
    timeBoundaryRanges: ValueRangePair | null,
    boardTime: InputTimeBounds,
    panelTime: PanelTime,
): TimeRangeMs | undefined {
    if (mode === 'initialize') {
        return normalizeEditBoardLastRange(timeBoundaryRanges);
    }

    return (
        normalizeEditPreviewTimeRange(timeBoundaryRanges) ??
        setTimeRange(
            normalizePanelTimeRangeSource(panelTime),
            normalizeBoardTimeRangeInput(boardTime),
        )
    );
}

/**
 * Resolves the top-level range candidate for the current mode.
 * Intent: Apply the edit and initialize precedence rules before deeper range resolution.
 * @param {PanelRangeResolutionMode} mode - The current resolution mode.
 * @param {boolean} isEdit - Whether the current flow is edit mode.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched boundary ranges.
 * @returns {TimeRangeMs | undefined} The top-level range candidate, or undefined when none applies.
 */
function resolveTopLevelRange(
    mode: PanelRangeResolutionMode,
    isEdit: boolean,
    boardTime: InputTimeBounds,
    timeBoundaryRanges: ValueRangePair | null,
): TimeRangeMs | undefined {
    if (isEdit) {
        return mode === 'initialize'
            ? normalizeEditBoardLastRange(timeBoundaryRanges)
            : undefined;
    }

    return normalizeBoardLastRange(boardTime, timeBoundaryRanges);
}

/**
 * Resolves the fallback range when no higher-priority rule applies.
 * Intent: Provide the last safety net for panel range resolution.
 * @param {PanelRangeResolutionMode} mode - The current resolution mode.
 * @param {boolean} isEdit - Whether the current flow is edit mode.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {TimeRangeMs} The fallback time range.
 */
function resolveFallbackRange(
    mode: PanelRangeResolutionMode,
    isEdit: boolean,
    boardTime: InputTimeBounds,
    panelTime: PanelTime,
    timeBoundaryRanges: ValueRangePair | null,
): TimeRangeMs {
    const sBaseFallbackRange =
        isEdit || mode === 'initialize'
            ? setTimeRange(
                  normalizePanelTimeRangeSource(panelTime),
                  normalizeBoardTimeRangeInput(boardTime),
              )
            : getDefaultBoardRange(boardTime, panelTime);

    if (isConcreteTimeRange(sBaseFallbackRange)) {
        return sBaseFallbackRange;
    }

    const sBoundaryFallbackRange = createTimeBoundaryFallbackRange(timeBoundaryRanges);
    if (sBoundaryFallbackRange) {
        return sBoundaryFallbackRange;
    }

    return sBaseFallbackRange;
}

/**
 * Converts fetched time boundaries into a concrete fallback range.
 * Intent: Keep panels loadable when persisted files omit both explicit and default time windows.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched time boundaries for the current panel tags.
 * @returns {TimeRangeMs | undefined} The fallback range, or undefined when the boundaries are incomplete.
 */
function createTimeBoundaryFallbackRange(
    timeBoundaryRanges: ValueRangePair | null,
): TimeRangeMs | undefined {
    if (!timeBoundaryRanges) {
        return undefined;
    }

    const sStartTime = timeBoundaryRanges.start.min;
    const sEndTime = timeBoundaryRanges.end.max;

    if (sStartTime <= 0 || sEndTime <= sStartTime) {
        return undefined;
    }

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}

/**
 * Builds the default board range from panel defaults and board input.
 * Intent: Provide a stable final fallback when no explicit board range is available.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {TimeRangeMs} The default board range.
 */
function getDefaultBoardRange(
    boardTime: InputTimeBounds,
    panelTime: PanelTime,
): TimeRangeMs {
    return setTimeRange(
        {
            range: undefined,
            defaultRange: {
                startTime: panelTime.default_range?.min ?? 0,
                endTime: panelTime.default_range?.max ?? 0,
            },
        },
        normalizeBoardTimeRangeInput(boardTime),
    );
}

/**
 * Decides whether the absolute panel range should be considered.
 * Intent: Limit absolute panel range handling to the reset flow in non-edit mode.
 * @param {PanelRangeResolutionMode} mode - The current resolution mode.
 * @param {boolean} isEdit - Whether the current flow is edit mode.
 * @returns {boolean | undefined} True when the absolute range should be included, otherwise undefined.
 */
function shouldIncludeAbsolutePanelRange(
    mode: PanelRangeResolutionMode,
    isEdit: boolean,
): boolean | undefined {
    return !isEdit && mode === 'reset' ? true : undefined;
}

/**
 * Normalizes the board's last-relative range into concrete values.
 * Intent: Resolve board-relative last ranges against the fetched boundary ranges.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched boundary ranges.
 * @returns {TimeRangeMs | undefined} The normalized board last range, or undefined when it cannot be resolved.
 */
function normalizeBoardLastRange(
    boardTime: InputTimeBounds,
    timeBoundaryRanges: ValueRangePair | null,
): TimeRangeMs | undefined {
    if (
        boardTime.kind !== 'resolved' ||
        !timeBoundaryRanges ||
        !isLastRelativeTimeRangeConfig(boardTime.value.rangeConfig)
    ) {
        return undefined;
    }

    return resolveLastRelativeTimeRange(timeBoundaryRanges.end.max, boardTime.value.rangeConfig);
}

/**
 * Normalizes the edit board's last fetched range into a concrete range.
 * Intent: Preserve the last known board bounds during edit initialization.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched boundary ranges.
 * @returns {TimeRangeMs | undefined} The normalized edit board last range, or undefined when missing.
 */
function normalizeEditBoardLastRange(
    timeBoundaryRanges: ValueRangePair | null,
): TimeRangeMs | undefined {
    if (!timeBoundaryRanges) {
        return undefined;
    }

    return {
        startTime: timeBoundaryRanges.start.max,
        endTime: timeBoundaryRanges.end.max,
    };
}

/**
 * Normalizes the edit preview range into a concrete optional range.
 * Intent: Preserve the fetched edit preview values when they are available.
 * @param {ValueRangePair | null} timeBoundaryRanges - The fetched boundary ranges.
 * @returns {TimeRangeMs | undefined} The normalized preview range, or undefined when unavailable.
 */
function normalizeEditPreviewTimeRange(
    timeBoundaryRanges: ValueRangePair | null,
): TimeRangeMs | undefined {
    if (!timeBoundaryRanges) {
        return undefined;
    }

    return {
        startTime: timeBoundaryRanges.start.min,
        endTime: timeBoundaryRanges.end.max,
    };
}

/**
 * Normalizes an absolute panel range into a concrete optional range.
 * Intent: Use the panel's explicit absolute values when the configuration is absolute.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {TimeRangeMs | undefined} The absolute panel range, or undefined when the config is not absolute.
 */
function normalizeAbsolutePanelRange(panelTime: PanelTime): TimeRangeMs | undefined {
    if (!isAbsoluteTimeRangeConfig(panelTime.range_config)) {
        return undefined;
    }

    return {
        startTime: panelTime.range_bgn,
        endTime: panelTime.range_end,
    };
}

/**
 * Normalizes a now-relative panel range through the shared time source selection.
 * Intent: Resolve now-based panel ranges from the panel, board, or default source consistently.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {TimeRangeMs | undefined} The now-relative panel range, or undefined when the config is not now-relative.
 */
function normalizeNowPanelRange(
    boardTime: InputTimeBounds,
    panelTime: PanelTime,
): TimeRangeMs | undefined {
    if (!isNowRelativeTimeRangeConfig(panelTime.range_config)) {
        return undefined;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(panelTime),
        normalizeBoardTimeRangeInput(boardTime),
    );
}

/**
 * Resolves a relative last-based panel range from fetched tag time boundaries.
 * Intent: Use virtual stats to translate panel-relative last ranges into concrete timestamps.
 * @param {PanelData} panelData - The panel data payload.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {Promise<TimeRangeMs | undefined>} The resolved relative panel range, or undefined when it cannot be derived.
 */
async function getRelativePanelLastRange(
    panelData: PanelData,
    boardTime: InputTimeBounds,
    panelTime: PanelTime,
): Promise<TimeRangeMs | undefined> {
    if (
        boardTime.kind !== 'resolved' ||
        !isLastRelativeTimeRangeConfig(panelTime.range_config) ||
        !isRelativeTimeRangeConfig(boardTime.value.rangeConfig)
    ) {
        return undefined;
    }

    const sBoardRangeInput = toStoredTimeRangeInput({
        range: { min: 0, max: 0 },
        rangeConfig: boardTime.value.rangeConfig,
    });
    const sPanelRangeInput = toStoredTimeRangeInput({
        range: { min: panelTime.range_bgn, max: panelTime.range_end },
        rangeConfig: panelTime.range_config,
    });
    const sTimeRange = await resolveTimeBoundaryRanges(
        panelData.tag_set,
        sBoardRangeInput,
        sPanelRangeInput,
    );
    if (!sTimeRange) {
        return undefined;
    }

    return resolveLastRelativeTimeRange(sTimeRange.end.max, panelTime.range_config);
}

/**
 * Resolves the final panel range by applying the rule chain in priority order.
 * Intent: Keep the range resolution precedence in one place for easier maintenance.
 * @param {TimeRangeMs | undefined} topLevelRange - The highest-priority resolved range, if any.
 * @param {InputTimeBounds} boardTime - The board time input.
 * @param {PanelData} panelData - The panel data payload.
 * @param {PanelTime} panelTime - The panel time payload.
 * @param {boolean | undefined} includeAbsolutePanelRange - Whether absolute panel ranges should be considered.
 * @param {() => TimeRangeMs} fallbackRange - The fallback range resolver.
 * @returns {Promise<TimeRangeMs>} The resolved panel range.
 */
async function resolvePanelRangeFromRules(
    topLevelRange: TimeRangeMs | undefined,
    boardTime: InputTimeBounds,
    panelData: PanelData,
    panelTime: PanelTime,
    includeAbsolutePanelRange: boolean | undefined,
    fallbackRange: () => TimeRangeMs,
): Promise<TimeRangeMs> {
    if (topLevelRange) {
        return topLevelRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(
        panelData,
        boardTime,
        panelTime,
    );
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
 * @param {TimeBoundary} startValue - The start boundary to resolve.
 * @param {TimeBoundary} endValue - The end boundary to resolve.
 * @returns {TimeRangeMs | undefined} The concrete range, or undefined when the inputs are incomplete.
 */
function buildConcreteTimeRange(
    startValue: TimeBoundary,
    endValue: TimeBoundary,
): TimeRangeMs | undefined {
    if (isEmptyTimeBoundary(startValue) || isEmptyTimeBoundary(endValue)) {
        return undefined;
    }

    if (isLastRelativeTimeBoundary(startValue) || isLastRelativeTimeBoundary(endValue)) {
        return undefined;
    }

    return {
        startTime: resolveTimeBoundaryValue(startValue),
        endTime: resolveTimeBoundaryValue(endValue),
    };
}

/**
 * Checks whether a partial time range has both start and end values.
 * Intent: Validate restored time-range pairs before reusing them.
 * @param {Partial<TimeRangeMs>} range - The partial range to inspect.
 * @returns {aRange is TimeRangeMs} True when both range values are present.
 */
function isCompleteTimeRange(range: Partial<TimeRangeMs>): range is TimeRangeMs {
    return range.startTime !== undefined && range.endTime !== undefined;
}
