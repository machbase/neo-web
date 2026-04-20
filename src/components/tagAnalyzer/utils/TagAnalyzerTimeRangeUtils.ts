import moment from 'moment';
import type {
    InputTimeBounds,
    ResolvedTimeBounds,
    TimeBoundary,
    TimeRange,
    TimeRangeConfig,
    TimeRangePair,
    ValueRange,
} from './ModelTypes';
import type { OptionalTimeRange } from './TagAnalyzerSharedTypes';
import type { LegacyTimeValue } from './legacy/LegacyTypes';
import {
    isEmptyTimeBoundary,
    isLastRelativeTimeBoundary,
    resolveTimeBoundaryValue,
} from './TagAnalyzerTimeRangeConfig';

// Used by TagAnalyzer time-range utilities to type normalized panel time sources.
export type TagAnalyzerPanelTimeRangeSource = {
    range: OptionalTimeRange;
    defaultRange: TimeRange;
};

export type NormalizedTimeRangePairResult =
    | {
          kind: 'empty';
      }
    | {
          kind: 'resolved';
          value: TimeRangePair;
      };

/**
 * Detects whether a range value uses any relative-time format (last or now).
 * @param aValue The range value to inspect.
 * @returns Whether the value is a relative time string.
 */
export function isRelativeTimeValue(aValue: string): boolean {
    return isLastRelativeTimeValue(aValue) || isNowRelativeTimeValue(aValue);
}

/**
 * Detects whether a range value uses the "last ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a last-relative time string.
 */
export function isLastRelativeTimeValue(aValue: string): boolean {
    return aValue.toLowerCase().includes('last');
}

/**
 * Detects whether a range value uses the "now ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a now-relative time string.
 */
export function isNowRelativeTimeValue(aValue: string): boolean {
    return aValue.toLowerCase().includes('now');
}

export const EMPTY_TAG_ANALYZER_TIME_RANGE: TimeRange = { startTime: 0, endTime: 0 };

/**
 * Returns whether two time ranges describe the same visible window.
 * @param aLeft The first time range to compare.
 * @param aRight The second time range to compare.
 * @returns Whether both ranges are equal.
 */
export function isSameTimeRange(aLeft: TimeRange, aRight: TimeRange): boolean {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
}

/**
 * Converts one provided range source into a concrete time range when it is fully resolvable.
 * @param aRange The provided range source to convert.
 * @returns The concrete range source, or `undefined` when the source is incomplete.
 */
export function toConcreteTimeRange(
    aRange: ValueRange | TimeRangeConfig,
): OptionalTimeRange {
    if ('min' in aRange && 'max' in aRange) {
        return { startTime: aRange.min, endTime: aRange.max };
    }

    return buildConcreteTimeRangeSource(aRange.start, aRange.end);
}

/**
 * Normalizes one resolved range/config pair into the concrete runtime range used by callers.
 * @param aTimeBounds The resolved range/config pair to normalize.
 * @returns The concrete time range, or `undefined` when it still cannot be resolved safely.
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
 * Converts the normalized board-level time input into an optional concrete time range.
 * @param aBoardTime The normalized board-level time input.
 * @returns The concrete board range when available.
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
 * Normalizes raw panel time into the concrete range/default shape used by range resolution.
 * @param aPanelTime The raw panel time settings to normalize.
 * @returns The normalized panel time source.
 */
export function normalizePanelTimeRangeSource(
    aPanelTime: {
        range_bgn: number;
        range_end: number;
        range_config: TimeRangeConfig;
        default_range: ValueRange | undefined;
    },
): TagAnalyzerPanelTimeRangeSource {
    const sDefaultRange = aPanelTime.default_range;

    return {
        range: toConcreteTimeRange(aPanelTime.range_config),
        defaultRange: sDefaultRange
            ? {
                  startTime: sDefaultRange.min,
                  endTime: sDefaultRange.max,
              }
            : EMPTY_TAG_ANALYZER_TIME_RANGE,
    };
}

/**
 * Resolves the effective panel range from panel, board, and default values.
 * @param aPanelRangeSource The normalized panel range plus concrete default range.
 * @param aBoardRangeSource The optional normalized board range override.
 * @returns The resolved time range in absolute UTC milliseconds.
 */
export function setTimeRange(
    aPanelRangeSource: TagAnalyzerPanelTimeRangeSource,
    aBoardRangeSource: OptionalTimeRange,
): TimeRange {
    const sResolvedRangeSource = aPanelRangeSource.range ?? aBoardRangeSource;
    if (!sResolvedRangeSource) {
        return aPanelRangeSource.defaultRange;
    }

    return sResolvedRangeSource;
}

/**
 * Converts a stored range value into an absolute UTC timestamp.
 * @param aTime The stored range value, which may already be numeric or relative.
 * @returns The resolved UTC timestamp in milliseconds.
 */
export function convertTimeToFullDate(aTime: LegacyTimeValue | undefined): number {
    if (typeof aTime !== 'string') {
        return aTime ?? 0;
    }

    if (aTime.toLowerCase().includes('last')) {
        return 0;
    }

    const sRelativeTime = aTime.split('-')[1];
    if (!sRelativeTime) {
        return moment().valueOf();
    }

    const sTimeNumber = Number.parseInt(sRelativeTime, 10);
    const sTimeUnit = sRelativeTime.match(/[a-zA-Z]/g)?.join('');
    if (!sTimeUnit) {
        return moment().valueOf();
    }

    return moment()
        .subtract(sTimeNumber, sTimeUnit as moment.unitOfTime.DurationConstructor)
        .valueOf();
}

/**
 * Rehydrates persisted panel and navigator ranges from the saved time-range pair.
 * @param aTimeKeeper The stored `time_keeper` payload.
 * @returns The restored panel and navigator ranges, or an explicit empty result when the payload is incomplete.
 */
export function normalizeTimeRangePair(
    aTimeKeeper: Partial<TimeRangePair> | undefined,
): NormalizedTimeRangePairResult {
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

/**
 * Normalizes one start/end pair into a concrete range source or `undefined` when either side is absent.
 * @param aStartValue The potential start boundary to normalize.
 * @param aEndValue The potential end boundary to normalize.
 * @returns The concrete range source, or `undefined` when the pair is incomplete.
 */
function buildConcreteTimeRangeSource(
    aStartValue: TimeBoundary | undefined,
    aEndValue: TimeBoundary | undefined,
): OptionalTimeRange {
    if (aStartValue === undefined || aEndValue === undefined) {
        return undefined;
    }

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

function isCompleteTimeRange(aRange: Partial<TimeRange>): aRange is TimeRange {
    return aRange.startTime !== undefined && aRange.endTime !== undefined;
}
