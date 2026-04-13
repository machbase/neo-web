import moment from 'moment';
import type {
    TagAnalyzerDefaultRange,
    TagAnalyzerInputRangeValue,
    TagAnalyzerPanelTime,
    TimeRange,
} from '../panel/PanelModel';

// Used by TagAnalyzerDateUtils to type panel time range source.
export type TagAnalyzerPanelTimeRangeSource = {
    range: TimeRange | null;
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
 * Normalizes one raw start/end pair into a concrete range source or `null` when either side is absent.
 * @param aRange The raw range boundaries to normalize.
 * @returns The concrete range source, or `null` when the pair is incomplete.
 */
export function normalizeTimeRangeSource(
    aRange: (Pick<TagAnalyzerPanelTime, 'range_bgn' | 'range_end'> | null) | undefined,
): TimeRange | null {
    if (!aRange) {
        return null;
    }

    return buildConcreteTimeRangeSource(aRange.range_bgn, aRange.range_end);
}

/**
 * Normalizes raw panel time into the concrete range/default shape used by range resolution.
 * @param aPanelTime The raw panel time settings to normalize.
 * @returns The normalized panel time source.
 */
export function normalizePanelTimeRangeSource(
    aPanelTime: Pick<TagAnalyzerPanelTime, 'range_bgn' | 'range_end' | 'default_range'>,
): TagAnalyzerPanelTimeRangeSource {
    return {
        range: buildConcreteTimeRangeSource(aPanelTime.range_bgn, aPanelTime.range_end),
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
    aBoardRangeSource: TimeRange | null,
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
export function convertTimeToFullDate(aTime: TagAnalyzerInputRangeValue | undefined): number {
    if (typeof aTime !== 'string') {
        return aTime ?? 0;
    }

    const sRelativeTime = aTime.split('-')[1];
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
 * Normalizes one start/end pair into a concrete range source or `null` when either side is absent.
 * @param aStartValue The potential start boundary to normalize.
 * @param aEndValue The potential end boundary to normalize.
 * @returns The concrete range source, or `null` when the pair is incomplete.
 */
function buildConcreteTimeRangeSource(
    aStartValue: TagAnalyzerInputRangeValue | undefined,
    aEndValue: TagAnalyzerInputRangeValue | undefined,
): TimeRange | null {
    if (
        aStartValue === '' ||
        aStartValue === undefined ||
        aEndValue === '' ||
        aEndValue === undefined
    ) {
        return null;
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
