import type { PanelData, PanelTime } from '../PanelModelTypes';
import { resolveTimeBoundaryRanges } from '../fetch/TimeBoundaryRangeResolver';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
    ResolvedTimeRangeMs,
} from '../time/TimeTypes';
import {
    isConcreteTimeRange,
    convertTimeRangeConfigToResolvedTimeRangeMs,
} from '../time/TimeBoundaryConverters';
import {
    resolvePanelOrBoardTimeRange,
} from './PanelTimeRangeSourceUtils';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';

type PanelRangeResolutionMode = 'initialize' | 'reset';

/**
 * Resolves the active panel time range for the current mode and inputs.
 * Intent: Centralize the panel range decision tree for reset and initialize flows.
 * @param {TimeRangeConfig | undefined} boardTime - The board time input.
 * @param {PanelData} panelData - The panel data payload.
 * @param {PanelTime} panelTime - The panel time payload.
 * @param {FetchedTimeBoundaryRange | null} timeBoundaryRanges - The fetched time boundary ranges.
 * @param {PanelRangeResolutionMode} mode - The current resolution mode.
 * @returns {Promise<ResolvedTimeRangeMs>} The resolved panel time range.
 */
export async function resolvePanelTimeRange(
    boardTime: TimeRangeConfig | undefined,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
    mode: PanelRangeResolutionMode,
): Promise<ResolvedTimeRangeMs> {
    const sPanelOrBoardRange = resolvePanelOrBoardTimeRange(panelTime, boardTime);
    const sBoardPriorityRange = resolveBoardLastRange(boardTime, timeBoundaryRanges);
    if (sBoardPriorityRange) {
        return sBoardPriorityRange;
    }

    const sRelativePanelRange = await resolveRelativeOrNowPanelRange(
        boardTime,
        panelData,
        panelTime,
    );
    if (sRelativePanelRange) {
        return sRelativePanelRange;
    }

    if (mode === 'reset') {
        const sAbsolutePanelRange = resolveAbsolutePanelRange(panelTime);
        if (sAbsolutePanelRange) {
            return sAbsolutePanelRange;
        }

        return resolveConcreteRangeFallback(
            getBoardFallbackRange(boardTime),
            timeBoundaryRanges,
        );
    }

    return resolveConcreteRangeFallback(
        sPanelOrBoardRange,
        timeBoundaryRanges,
    );
}

/**
 * Compares two time ranges for exact equality.
 * Intent: Provide a simple equality check for resolved panel and navigator ranges.
 * @param {ResolvedTimeRangeMs} left - The first range to compare.
 * @param {ResolvedTimeRangeMs} right - The second range to compare.
 * @returns {boolean} True when both ranges have the same start and end times.
 */
export function isSameTimeRange(left: ResolvedTimeRangeMs, right: ResolvedTimeRangeMs): boolean {
    return left.startTime === right.startTime && left.endTime === right.endTime;
}

/**
 * Builds the board fallback range from board input only.
 * Intent: Keep reset-mode fallback aligned with the current runtime model, which no longer carries panel default ranges.
 * @param {TimeRangeConfig | undefined} boardTime - The board time input.
 * @returns {ResolvedTimeRangeMs} The board fallback range.
 */
function getBoardFallbackRange(
    boardTime: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs {
    if (
        !boardTime ||
        boardTime.start.kind === 'empty' ||
        boardTime.end.kind === 'empty' ||
        boardTime.start.kind === 'last' ||
        boardTime.end.kind === 'last'
    ) {
        return EMPTY_TIME_RANGE;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(boardTime);
}

/**
 * Resolves the board's last-relative range into concrete values.
 * Intent: Resolve board-relative last ranges against the fetched boundary ranges.
 * @param {TimeRangeConfig | undefined} boardTime - The board time input.
 * @param {FetchedTimeBoundaryRange | null} timeBoundaryRanges - The fetched boundary ranges.
 * @returns {ResolvedTimeRangeMs | undefined} The resolved board last range, or undefined when it cannot be resolved.
 */
function resolveBoardLastRange(
    boardTime: TimeRangeConfig | undefined,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): ResolvedTimeRangeMs | undefined {
    if (
        !boardTime ||
        !timeBoundaryRanges ||
        boardTime.start.kind !== 'last' ||
        boardTime.end.kind !== 'last'
    ) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(boardTime, timeBoundaryRanges.end.max.timestamp);
}

/**
 * Resolves an absolute panel range into a concrete optional range.
 * Intent: Use the panel's explicit absolute values when the configuration is absolute.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {ResolvedTimeRangeMs | undefined} The absolute panel range, or undefined when the config is not absolute.
 */
function resolveAbsolutePanelRange(panelTime: PanelTime): ResolvedTimeRangeMs | undefined {
    if (
        panelTime.rangeConfig.start.kind !== 'absolute' ||
        panelTime.rangeConfig.end.kind !== 'absolute'
    ) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(panelTime.rangeConfig);
}

/**
 * Resolves a now-relative panel range through the shared time source selection.
 * Intent: Resolve now-based panel ranges from the panel or board source consistently.
 * @param {TimeRangeConfig | undefined} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {ResolvedTimeRangeMs | undefined} The now-relative panel range, or undefined when the config is not now-relative.
 */
function resolveNowRelativePanelRange(
    boardTime: TimeRangeConfig | undefined,
    panelTime: PanelTime,
): ResolvedTimeRangeMs | undefined {
    if (
        panelTime.rangeConfig.start.kind !== 'now' ||
        panelTime.rangeConfig.end.kind !== 'now'
    ) {
        return undefined;
    }

    return resolvePanelOrBoardTimeRange(panelTime, boardTime);
}

async function resolveRelativeOrNowPanelRange(
    boardTime: TimeRangeConfig | undefined,
    panelData: PanelData,
    panelTime: PanelTime,
): Promise<ResolvedTimeRangeMs | undefined> {
    const sRelativePanelLastRange = await resolveRelativePanelLastRange(
        boardTime,
        panelData,
        panelTime,
    );
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    return resolveNowRelativePanelRange(boardTime, panelTime);
}

/**
 * Resolves a relative last-based panel range from fetched tag time boundaries.
 * Intent: Use virtual stats to translate panel-relative last ranges into concrete timestamps.
 * @param {PanelData} panelData - The panel data payload.
 * @param {TimeRangeConfig | undefined} boardTime - The board time input.
 * @param {PanelTime} panelTime - The panel time payload.
 * @returns {Promise<ResolvedTimeRangeMs | undefined>} The resolved relative panel range, or undefined when it cannot be derived.
 */
async function resolveRelativePanelLastRange(
    boardTime: TimeRangeConfig | undefined,
    panelData: PanelData,
    panelTime: PanelTime,
): Promise<ResolvedTimeRangeMs | undefined> {
    if (
        panelTime.rangeConfig.start.kind !== 'last' ||
        panelTime.rangeConfig.end.kind !== 'last'
    ) {
        return undefined;
    }

    const sTimeRange = await resolveTimeBoundaryRanges(
        panelData.tag_set,
        boardTime ?? {
            start: { kind: 'empty' as const },
            end: { kind: 'empty' as const },
        },
        panelTime.rangeConfig,
    );
    if (!sTimeRange) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(panelTime.rangeConfig, sTimeRange.end.max.timestamp);
}

/**
 * Converts fetched time boundaries into a concrete fallback range.
 * Intent: Keep panels loadable when persisted files omit explicit time windows.
 * @param {FetchedTimeBoundaryRange | null} timeBoundaryRanges - The fetched time boundaries for the current panel tags.
 * @returns {ResolvedTimeRangeMs | undefined} The fallback range, or undefined when the boundaries are incomplete.
 */
function createTimeBoundaryFallbackRange(
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): ResolvedTimeRangeMs | undefined {
    if (!timeBoundaryRanges) {
        return undefined;
    }

    const sStartTime = timeBoundaryRanges.start.min.timestamp;
    const sEndTime = timeBoundaryRanges.end.max.timestamp;

    if (sStartTime <= 0 || sEndTime <= sStartTime) {
        return undefined;
    }

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}

/**
 * Resolves a concrete fallback range or falls back to fetched time boundaries.
 * Intent: Keep the panel-range policy explicit while still sharing the same final safety net.
 * @param {ResolvedTimeRangeMs} baseRange - The direct fallback range candidate.
 * @param {FetchedTimeBoundaryRange | null} timeBoundaryRanges - The fetched time boundaries for the current panel tags.
 * @returns {ResolvedTimeRangeMs} The resolved fallback range.
 */
function resolveConcreteRangeFallback(
    baseRange: ResolvedTimeRangeMs,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): ResolvedTimeRangeMs {
    if (isConcreteTimeRange(baseRange)) {
        return baseRange;
    }

    const sBoundaryFallbackRange = createTimeBoundaryFallbackRange(timeBoundaryRanges);
    if (sBoundaryFallbackRange) {
        return sBoundaryFallbackRange;
    }

    return baseRange;
}



