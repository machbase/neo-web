import { DEFAULT_VALUE_RANGE, type ValueRange } from '../domain/ValueRangeModel';
import {
    normalizePanelHighlight,
    type PanelHighlight,
    type PanelHighlightInput,
} from '../domain/PanelModel';
import {
    normalizeSeriesAnnotation,
    type SeriesAnnotation,
    type SeriesAnnotationInput,
} from '../domain/SeriesModel';
import type { TimeBoundary } from '../domain/time/TimeTypes';
import {
    createAbsoluteTimeBoundary,
    createAnchoredTimeBoundary,
    createEmptyTimeBoundary,
} from '../domain/time/TimeBoundaryFactories';

type TimeRangeLike = {
    startTime: number;
    endTime: number;
};
export function cloneTimeRange(timeRange: TimeRangeLike): TimeRangeLike {
    return {
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
    };
}
export function cloneSeriesAnnotations(
    annotations: SeriesAnnotationInput[] | undefined,
): SeriesAnnotation[] {
    return (annotations ?? []).map((annotation) =>
        normalizeSeriesAnnotation({
            text: annotation.text,
            timeRange: cloneTimeRange(annotation.timeRange),
            fillColor: annotation.fillColor,
            textColor: annotation.textColor,
            clip: annotation.clip,
        }),
    );
}
export function clonePanelHighlights(
    highlights: PanelHighlightInput[] | undefined,
): PanelHighlight[] {
    return (highlights ?? []).map((highlight) =>
        normalizePanelHighlight({
            text: highlight.text,
            timeRange: cloneTimeRange(highlight.timeRange),
            fillColor: highlight.fillColor,
            textColor: highlight.textColor,
        }),
    );
}
export function cloneValueRangeOrDefault(
    valueRange: ValueRange | undefined,
): ValueRange {
    return valueRange ? { ...valueRange } : { ...DEFAULT_VALUE_RANGE };
}
export function cloneTimeBoundary(boundary: TimeBoundary): TimeBoundary {
    switch (boundary.kind) {
        case 'empty':
            return createEmptyTimeBoundary();
        case 'absolute':
            return createAbsoluteTimeBoundary(boundary.timestamp);
        case 'now':
        case 'last':
            return createAnchoredTimeBoundary(
                boundary.kind,
                boundary.amount,
                boundary.unit,
            );
    }
}

