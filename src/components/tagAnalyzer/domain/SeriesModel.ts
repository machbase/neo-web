import type { TimeRangeMs } from './time/TimeTypes';

export const PANEL_TAG_LIMIT = 12;

export type PanelSeriesSourceColumns = {
    name: string;
    time: string;
    value: string;
    jsonKey?: string | undefined;
    [key: string]: unknown;
};

export const DEFAULT_PANEL_SERIES_SOURCE_COLUMNS: PanelSeriesSourceColumns = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

const TAG_ANALYZER_AGGREGATION_MODES = [
    { key: 'min', value: 'min' },
    { key: 'max', value: 'max' },
    { key: 'sum', value: 'sum' },
    { key: 'cnt', value: 'cnt' },
    { key: 'avg', value: 'avg' },
    { key: 'first', value: 'first' },
    { key: 'last', value: 'last' },
];

export const TAG_ANALYZER_AGGREGATION_MODE_OPTIONS = TAG_ANALYZER_AGGREGATION_MODES.map(
    (mode) => ({
        label: mode.value,
        value: mode.value,
        disabled: undefined,
    }),
);

export const DEFAULT_SERIES_ANNOTATION_FILL_COLOR = '#fff4b8';
export const DEFAULT_SERIES_ANNOTATION_TEXT_COLOR = '#161616';
export const DEFAULT_SERIES_ANNOTATION_LABEL = 'note';

export type SeriesAnnotation = {
    text: string;
    timeRange: TimeRangeMs;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

export type SeriesAnnotationInput = {
    text: string;
    timeRange: TimeRangeMs;
    fillColor?: string | undefined;
    textColor?: string | undefined;
    clip?: boolean | undefined;
};

export function normalizeSeriesAnnotation(
    annotation: SeriesAnnotationInput,
): SeriesAnnotation {
    return {
        text: annotation.text,
        timeRange: { ...annotation.timeRange },
        fillColor: annotation.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
        textColor: annotation.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
        clip: annotation.clip === true,
    };
}

export type PanelSeriesDefinition = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    sourceColumns: PanelSeriesSourceColumns;
    annotations: SeriesAnnotation[];
    [key: string]: unknown;
};
