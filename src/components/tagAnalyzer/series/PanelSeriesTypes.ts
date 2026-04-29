import type { TimeRangeMs } from '../time/TimeTypes';

export type PanelSeriesSourceColumns = {
    name: string;
    time: string;
    value: string;
    [key: string]: unknown;
};

export const DEFAULT_PANEL_SERIES_SOURCE_COLUMNS: PanelSeriesSourceColumns = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

export const TAG_ANALYZER_AGGREGATION_MODES = [
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

export type SeriesAnnotation = {
    text: string;
    timeRange: TimeRangeMs;
};

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
