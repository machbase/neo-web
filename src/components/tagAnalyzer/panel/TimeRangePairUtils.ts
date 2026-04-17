import type { TimeRangePair, TimeRange } from '../common/modelTypes';

/**
 * Rehydrates persisted panel and navigator ranges from the saved time-range pair.
 * @param aTimeKeeper The stored `time_keeper` payload.
 * @returns The restored panel and navigator ranges, or `undefined` when the payload is incomplete.
 */
export function resolveTimeRangePair(
    aTimeKeeper: Partial<TimeRangePair> | undefined,
): { panelRange: TimeRange; navigatorRange: TimeRange } | undefined {
    if (
        !isCompleteTimeRange(aTimeKeeper?.panelRange) ||
        !isCompleteTimeRange(aTimeKeeper?.navigatorRange)
    ) {
        return undefined;
    }

    return {
        panelRange: aTimeKeeper.panelRange,
        navigatorRange: aTimeKeeper.navigatorRange,
    };
}

/**
 * Serializes the current panel and navigator windows into the saved time-range pair.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns The persisted `time_keeper` payload.
 */
export function createTimeRangePair(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
): TimeRangePair {
    return {
        panelRange: aPanelRange,
        navigatorRange: aNavigatorRange,
    };
}

/**
 * Chooses the range that should be broadcast as the current global time selection.
 * @param aPreOverflowRange The pre-overflow panel range, when one exists.
 * @param aPanelRange The current panel range.
 * @returns The range that should be broadcast globally.
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

function isCompleteTimeRange(aRange: Partial<TimeRange> | undefined): aRange is TimeRange {
    return aRange?.startTime !== undefined && aRange.endTime !== undefined;
}
