import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';

export const PANEL_TAG_LIMIT = 12;

export type PanelSeriesSourceColumns = {
    name: string;
    time: string;
    value: string;
    jsonKey?: string | undefined;
    timeType?: number | undefined;
    timeBaseTime?: boolean | undefined;
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
    [key: string]: unknown;
};

type SeriesKeyAxisKind = 'datetime' | 'double';

type SeriesWithSourceColumns = {
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined;
};

export const MIXED_X_AXIS_KIND_WARNING =
    'Datetime and numeric x-axis series cannot be mixed in one chart.';

export function isNumericBaseTimeSourceColumns(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): boolean {
    return (
        sourceColumns?.timeBaseTime === true &&
        Number(sourceColumns.timeType) !== DATETIME_COLUMN_TYPE
    );
}

function isKeyDoubleSourceColumns(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): boolean {
    return isNumericBaseTimeSourceColumns(sourceColumns);
}

function isKeyDateTimeSourceColumns(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): boolean {
    return !isKeyDoubleSourceColumns(sourceColumns);
}

function getSeriesKeyAxisKind(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): SeriesKeyAxisKind {
    return isKeyDoubleSourceColumns(sourceColumns) ? 'double' : 'datetime';
}

export function isBaseTimeSourceColumns(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): boolean {
    return sourceColumns?.timeBaseTime === true;
}

export function hasNumericBaseTimeSeries(
    seriesList: SeriesWithSourceColumns[] = [],
): boolean {
    return seriesList.some((series) =>
        isKeyDoubleSourceColumns(series.sourceColumns),
    );
}

export function hasMixedXAxisValueKinds(
    seriesList: SeriesWithSourceColumns[] = [],
): boolean {
    const sHasNumericBaseTime = hasNumericBaseTimeSeries(seriesList);
    const sHasDateTimeAxis = seriesList.some(
        (series) => isKeyDateTimeSourceColumns(series.sourceColumns),
    );

    return sHasNumericBaseTime && sHasDateTimeAxis;
}

export function getMixedXAxisValueKindWarning(
    seriesList: SeriesWithSourceColumns[] = [],
): string | undefined {
    return hasMixedXAxisValueKinds(seriesList)
        ? MIXED_X_AXIS_KIND_WARNING
        : undefined;
}

export function getSeriesListKeyAxisKind(
    seriesList: SeriesWithSourceColumns[] = [],
): SeriesKeyAxisKind | undefined {
    if (seriesList.length === 0 || hasMixedXAxisValueKinds(seriesList)) {
        return undefined;
    }

    return getSeriesKeyAxisKind(seriesList[0]?.sourceColumns);
}

const TAG_ANALYZER_LINE_COLORS = [
    '#367FEB',
    '#EB5757',
    '#6FCF97',
    '#FFD95F',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#2D9CDB',
    '#C3A080',
    '#C9C9C9',
    '#6B6B6B',
];

type SeriesWithOptionalColor = {
    color?: string | undefined;
};

export function getPanelSeriesDisplayColor(
    series: SeriesWithOptionalColor,
    seriesIndex: number,
): string {
    return series.color ?? TAG_ANALYZER_LINE_COLORS[seriesIndex % TAG_ANALYZER_LINE_COLORS.length];
}
