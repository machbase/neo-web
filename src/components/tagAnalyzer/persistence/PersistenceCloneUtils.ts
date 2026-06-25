import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelAnnotation,
    type PanelHighlight,
} from '../domain/panel/PanelConfig';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
} from '../domain/SeriesDomain';
import type {
    PersistedPanelAnnotationInput,
    PersistedSeriesAnnotationInput,
} from './TazPersistenceTypesV200';

type TimeRangeLike = {
    startTime: number;
    endTime: number;
};

type PanelHighlightInput = {
    text: string;
    timeRange: TimeRangeLike;
    fillColor?: string | undefined;
    textColor?: string | undefined;
};

type SeriesAnnotation = {
    text: string;
    timeRange: TimeRangeLike;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

function cloneTimeRange(timeRange: TimeRangeLike): TimeRangeLike {
    return {
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
    };
}
export function cloneSeriesAnnotations(
    annotations: PersistedSeriesAnnotationInput[] | undefined,
): SeriesAnnotation[] {
    return (annotations ?? []).map((annotation) =>
        ({
            text: annotation.text,
            timeRange: cloneTimeRange(annotation.timeRange),
            fillColor: annotation.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: annotation.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            clip: annotation.clip === true,
        }),
    );
}
export function clonePanelHighlights(
    highlights: PanelHighlightInput[] | undefined,
): PanelHighlight[] {
    return (highlights ?? []).map((highlight) =>
        ({
            text: highlight.text,
            timeRange: cloneTimeRange(highlight.timeRange),
            fillColor: highlight.fillColor ?? DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
            textColor: highlight.textColor ?? DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        }),
    );
}
export function clonePanelAnnotations(
    annotations: PersistedPanelAnnotationInput[] | undefined,
): PanelAnnotation[] {
    return (annotations ?? []).map((annotation) =>
        ({
            seriesKey: annotation.seriesKey,
            text: annotation.text || DEFAULT_SERIES_ANNOTATION_LABEL,
            timeRange: cloneTimeRange(annotation.timeRange),
            fillColor: annotation.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: annotation.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            clip: annotation.clip === true,
        }),
    );
}
