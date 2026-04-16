import moment from 'moment';
import type {
    TagAnalyzerDefaultRange,
    TimeRange,
} from '../common/CommonType';
import type {
    LegacyTimeRange,
    LegacyTimeValue,
} from './legacy/LegacyTimeRangeTypes';

// --- Relative time detection ---

/**
 * Detects whether a range value uses any relative-time format (last or now).
 * @param aValue The range value to inspect.
 * @returns Whether the value is a relative time string.
 */
export function isRelativeTimeValue(aValue: LegacyTimeValue): aValue is string {
    return isLastRelativeTimeValue(aValue) || isNowRelativeTimeValue(aValue);
}

/**
 * Detects whether a range value uses the "last ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a last-relative time string.
 */
export function isLastRelativeTimeValue(aValue: LegacyTimeValue): aValue is string {
    return typeof aValue === 'string' && aValue.toLowerCase().includes('last');
}

/**
 * Detects whether a range value uses the "now ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a now-relative time string.
 */
export function isNowRelativeTimeValue(aValue: LegacyTimeValue): aValue is string {
    return typeof aValue === 'string' && aValue.toLowerCase().includes('now');
}

// Used by TagAnalyzerDateUtils to type panel time range source.
export type TagAnalyzerPanelTimeRangeSource = {
    range: TimeRange | undefined;
    defaultRange: TimeRange;
};

/**
 * Builds the canonical time-range shape used across TagAnalyzer.
 * @param startTime The range start time in milliseconds.
 * @param endTime The range end time in milliseconds.
 * @returns The normalized time-range object.
 */
export function createTagAnalyzerTimeRange(startTime: number, endTime: number): TimeRange {
    return { startTime, endTime };
}

export const EMPTY_TAG_ANALYZER_TIME_RANGE: TimeRange = createTagAnalyzerTimeRange(0, 0);

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
 * Normalizes one raw start/end pair into a concrete range source or `undefined` when either side is absent.
 * @param aRange The raw range boundaries to normalize.
 * @returns The concrete range source, or `undefined` when the pair is incomplete.
 */
export function normalizeTimeRangeSource(
    aRange: TagAnalyzerDefaultRange | LegacyTimeRange | undefined,
): TimeRange | undefined {
    if (!aRange) {
        return undefined;
    }

    if ('min' in aRange && 'max' in aRange) {
        return createTagAnalyzerTimeRange(aRange.min, aRange.max);
    }

    return buildConcreteTimeRangeSource(aRange.range_bgn, aRange.range_end);
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
        legacy_range?: LegacyTimeRange | undefined;
        default_range: TagAnalyzerDefaultRange | undefined;
    },
): TagAnalyzerPanelTimeRangeSource {
    const sRangeSource = aPanelTime.legacy_range
        ? normalizeTimeRangeSource(aPanelTime.legacy_range)
        : createTagAnalyzerTimeRange(aPanelTime.range_bgn, aPanelTime.range_end);

    return {
        range: sRangeSource,
        defaultRange: buildDefaultTimeRange(aPanelTime.default_range),
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
    aBoardRangeSource: TimeRange | undefined,
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

    const sTime = aTime;
    if (sTime.toLowerCase().includes('last')) {
        return 0;
    }

    const sRelativeTime = sTime.split('-')[1];
    if (!sRelativeTime) {
        return moment().unix() * 1000;
    }

    const sTimeNumber = Number.parseInt(sRelativeTime, 10);
    const sTimeUnit = sRelativeTime.match(/[a-zA-Z]/g)?.join('');
    if (!sTimeUnit) {
        return moment().unix() * 1000;
    }

    return (
        moment()
            .subtract(sTimeNumber, sTimeUnit as moment.unitOfTime.DurationConstructor)
            .unix() * 1000
    );
}

/**
 * Normalizes one start/end pair into a concrete range source or `undefined` when either side is absent.
 * @param aStartValue The potential start boundary to normalize.
 * @param aEndValue The potential end boundary to normalize.
 * @returns The concrete range source, or `undefined` when the pair is incomplete.
 */
function buildConcreteTimeRangeSource(
    aStartValue: LegacyTimeValue | undefined,
    aEndValue: LegacyTimeValue | undefined,
): TimeRange | undefined {
    if (
        aStartValue === '' ||
        aStartValue === undefined ||
        aEndValue === '' ||
        aEndValue === undefined
    ) {
        return undefined;
    }

    if (isLastRelativeTimeValue(aStartValue) || isLastRelativeTimeValue(aEndValue)) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(
        convertTimeToFullDate(aStartValue),
        convertTimeToFullDate(aEndValue),
    );
}

/**
 * Converts the stored default range into the concrete time-range shape used by the resolver.
 * @param aDefaultRange The stored default range from panel time settings.
 * @returns The concrete default time range used when no panel or board range applies.
 */
function buildDefaultTimeRange(aDefaultRange: TagAnalyzerDefaultRange | undefined): TimeRange {
    return createTagAnalyzerTimeRange(aDefaultRange?.min ?? 0, aDefaultRange?.max ?? 0);
}
