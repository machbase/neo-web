import type {
    PanelEChartType,
    ValueRange,
} from '../domain/panel/PanelConfig';
import type {
    TimeRangeInput,
} from '../domain/time/TimeTypes';

type PersistedSeriesColumnsV200 = {
    nameColumn: string | undefined;
    timeColumn: string | undefined;
    valueColumn: string | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesAnnotationInput = {
    text: string;
    timeRange: {
        startTime: number;
        endTime: number;
    };
    fillColor?: string | undefined;
    textColor?: string | undefined;
    clip?: boolean | undefined;
};

export type PersistedPanelAnnotationInput = PersistedSeriesAnnotationInput & {
    seriesKey: string;
};

type PersistedSeriesInfoV200 = {
    seriesKey: string;
    tableName: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    sourceColumns: PersistedSeriesColumnsV200;
    annotations?: PersistedSeriesAnnotationInput[] | undefined;
};

type PersistedPanelMetaV200 = {
    panelKey: string;
    chartTitle: string;
};

type PersistedPanelDataV200 = {
    seriesList: PersistedSeriesInfoV200[];
    rowLimit: number;
    intervalType: string | undefined;
};

type PersistedPanelToolbarV200 = {
    isRaw: boolean;
};

type PersistedPanelTimeV200 = {
    rangeConfig: TimeRangeInput;
    useLastViewedRange?: boolean | undefined;
    lastViewedRange?: unknown;
};

type PersistedPanelAxisThresholdV200 = {
    enabled: boolean;
    value: number;
};

type PersistedPanelXAxisV200 = {
    showTickLine: boolean;
    rawDataPixelsPerTick: number;
    calculatedDataPixelsPerTick: number;
};

type PersistedPanelSamplingV200 = {
    enabled: boolean;
    sampleCount: number;
};

type PersistedPanelYAxisV200 = {
    zeroBase: boolean;
    showTickLine: boolean;
    valueRange: ValueRange;
    rawDataValueRange: ValueRange;
    upperControlLimit: PersistedPanelAxisThresholdV200;
    lowerControlLimit: PersistedPanelAxisThresholdV200;
};

type PersistedPanelRightYAxisV200 = PersistedPanelYAxisV200 & {
    enabled: boolean;
};

type PersistedPanelAxesV200 = {
    xAxis: PersistedPanelXAxisV200;
    sampling?: PersistedPanelSamplingV200 | undefined;
    mainChartSampling?: PersistedPanelSamplingV200 | undefined;
    leftYAxis: PersistedPanelYAxisV200;
    rightYAxis: PersistedPanelRightYAxisV200;
};

type PersistedPanelDisplayV200 = {
    showLegend: boolean;
    useZoom: boolean;
    chartType: PanelEChartType;
    connectNulls?: boolean | undefined;
    showPoints: boolean;
    pointRadius: number;
    fill: number;
    stroke: number;
};

export type PersistedPanelHighlightV200 = {
    text: string;
    timeRange: {
        startTime: number;
        endTime: number;
    };
};

export type PersistedPanelInfoV200 = {
    meta: PersistedPanelMetaV200;
    data: PersistedPanelDataV200;
    toolbar: PersistedPanelToolbarV200;
    time: PersistedPanelTimeV200;
    axes: PersistedPanelAxesV200;
    display: PersistedPanelDisplayV200;
    useNormalizedValues: boolean;
    highlights?: PersistedPanelHighlightV200[] | undefined;
    annotations?: PersistedPanelAnnotationInput[] | undefined;
};

// The board time range persists as { start, end } expression strings (TAZ 2.1.0).
// Older files stored each side as a structured time-range object; the loader reads
// both and normalizes to strings, so the persisted shape is intentionally loose.
export type PersistedBoardTimeRange = {
    start?: unknown;
    end?: unknown;
};
