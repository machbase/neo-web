import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
} from '../markup/markupModel';
import type { AxisRange } from '../rangeExpression/rangeModel';
import type { PanelInfo } from './panelModel';

export type PanelHighlightInput = {
    text: string;
    timeRange: AxisRange;
    fillColor?: string;
    textColor?: string;
};

export type PanelAnnotationInput = PanelHighlightInput & {
    seriesKey: string;
    clip?: boolean;
    useDefaultLabel?: boolean;
};

export type PanelRestoreInput = Omit<PanelInfo, 'isOverlapSelected' | 'highlights' | 'annotations'> & {
    highlights?: PanelHighlightInput[];
    annotations?: PanelAnnotationInput[];
};

export function restorePanel(
    input: PanelRestoreInput,
): PanelInfo {
    const { highlights = [], annotations = [], ...panel } = input;
    return {
        ...panel,
        isOverlapSelected: false,
        highlights: highlights.map((highlight) => ({
            text: highlight.text,
            timeRange: { ...highlight.timeRange },
            fillColor: highlight.fillColor ?? DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
            textColor: highlight.textColor ?? DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        })),
        annotations: annotations.map((annotation) => ({
            text: annotation.useDefaultLabel === false
                ? annotation.text
                : annotation.text || DEFAULT_SERIES_ANNOTATION_LABEL,
            timeRange: { ...annotation.timeRange },
            fillColor: annotation.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: annotation.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            seriesKey: annotation.seriesKey,
            clip: annotation.clip === true,
        })),
    };
}
