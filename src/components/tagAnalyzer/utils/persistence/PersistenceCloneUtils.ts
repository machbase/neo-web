import { DEFAULT_VALUE_RANGE } from '../../TagAnalyzerCommonConstants';
import type { ValueRange } from '../../TagAnalyzerCommonTypes';
import type { PanelHighlight } from '../panelModelTypes';
import type { SeriesAnnotation } from '../series/PanelSeriesTypes';
import type { TimeBoundary } from '../time/types/TimeTypes';

type TimeRangeLike = {
    startTime: number;
    endTime: number;
};

/**
 * Clones one time range into a fresh object.
 * Intent: Keep persistence helpers from leaking runtime references.
 * @param {TimeRangeLike} timeRange - The time range to clone.
 * @returns {TimeRangeLike} The cloned time range.
 */
export function cloneTimeRange(timeRange: TimeRangeLike): TimeRangeLike {
    return {
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
    };
}

/**
 * Clones persisted or runtime series annotations.
 * Intent: Share the same annotation cloning logic across save and parse flows.
 * @param {SeriesAnnotation[] | undefined} annotations - The annotations to clone.
 * @returns {SeriesAnnotation[]} The cloned annotations.
 */
export function cloneSeriesAnnotations(
    annotations: SeriesAnnotation[] | undefined,
): SeriesAnnotation[] {
    return (annotations ?? []).map((annotation) => ({
        text: annotation.text,
        timeRange: cloneTimeRange(annotation.timeRange),
    }));
}

/**
 * Clones persisted or runtime panel highlights.
 * Intent: Share the same highlight cloning logic across save and parse flows.
 * @param {PanelHighlight[] | undefined} highlights - The highlights to clone.
 * @returns {PanelHighlight[]} The cloned highlights.
 */
export function clonePanelHighlights(
    highlights: PanelHighlight[] | undefined,
): PanelHighlight[] {
    return (highlights ?? []).map((highlight) => ({
        text: highlight.text,
        timeRange: cloneTimeRange(highlight.timeRange),
    }));
}

/**
 * Clones a value range or falls back to the default empty range.
 * Intent: Keep persisted axis ranges concrete even when the source omits them.
 * @param {ValueRange | undefined} valueRange - The value range to clone.
 * @returns {ValueRange} The cloned value range or the default range.
 */
export function cloneValueRangeOrDefault(
    valueRange: ValueRange | undefined,
): ValueRange {
    return valueRange ? { ...valueRange } : { ...DEFAULT_VALUE_RANGE };
}

/**
 * Clones one time boundary for persistence.
 * Intent: Keep boundary cloning in one place for board save helpers.
 * @param {TimeBoundary} boundary - The time boundary to clone.
 * @returns {TimeBoundary} The cloned time boundary.
 */
export function cloneTimeBoundary(boundary: TimeBoundary): TimeBoundary {
    switch (boundary.kind) {
        case 'empty':
            return { kind: 'empty' };
        case 'absolute':
            return {
                kind: 'absolute',
                timestamp: boundary.timestamp,
            };
        case 'relative':
            return {
                kind: 'relative',
                anchor: boundary.anchor,
                amount: boundary.amount,
                unit: boundary.unit,
                expression: boundary.expression,
            };
        case 'raw':
            return {
                kind: 'raw',
                value: boundary.value,
            };
    }
}
