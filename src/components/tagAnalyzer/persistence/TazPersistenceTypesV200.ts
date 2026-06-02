import type {
    PanelEChartType,
    ValueRange,
} from '../domain/PanelDomain';
import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
} from '../domain/time/TimeTypes';

type PersistedTimeBoundaryInputValue = string | number | '';

export type PersistedSeriesColumnsV200 = {
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

export type PersistedSeriesInfoV200 = {
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

export type PersistedPanelMetaV200 = {
    panelKey: string;
    chartTitle: string;
};

export type PersistedPanelDataV200 = {
    seriesList: PersistedSeriesInfoV200[];
    rowLimit: number;
    intervalType: string | undefined;
};

export type PersistedPanelToolbarV200 = {
    isRaw: boolean;
};

export type PersistedPanelTimeV200 = {
    rangeConfig: TimeRangeConfig;
    useLastViewedRange?: boolean | undefined;
    lastViewedRange?: Partial<PanelNavigatorRangePair> | undefined;
};

export type PersistedPanelAxisThresholdV200 = {
    enabled: boolean;
    value: number;
};

export type PersistedPanelXAxisV200 = {
    showTickLine: boolean;
    rawDataPixelsPerTick: number;
    calculatedDataPixelsPerTick: number;
};

export type PersistedPanelSamplingV200 = {
    enabled: boolean;
    sampleCount: number;
};

export type PersistedPanelYAxisV200 = {
    zeroBase: boolean;
    showTickLine: boolean;
    valueRange: ValueRange;
    rawDataValueRange: ValueRange;
    upperControlLimit: PersistedPanelAxisThresholdV200;
    lowerControlLimit: PersistedPanelAxisThresholdV200;
};

export type PersistedPanelRightYAxisV200 = PersistedPanelYAxisV200 & {
    enabled: boolean;
};

export type PersistedPanelAxesV200 = {
    xAxis: PersistedPanelXAxisV200;
    sampling?: PersistedPanelSamplingV200 | undefined;
    mainChartSampling?: PersistedPanelSamplingV200 | undefined;
    leftYAxis: PersistedPanelYAxisV200;
    rightYAxis: PersistedPanelRightYAxisV200;
};

export type PersistedPanelDisplayV200 = {
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

export type PersistedTazPanelInfo = PersistedPanelInfoV200 | Record<string, unknown>;

export type PersistedTimeBoundaryRecord =
    | TimeRangeConfig['start']
    | {
          kind: 'relative';
          anchor?: 'now' | 'last' | undefined;
          amount?: number | undefined;
          unit?: string | undefined;
          offsetMilliseconds?: number | undefined;
          [key: string]: unknown;
      }
    | Record<string, unknown>;

export type PersistedBoardTimeRange =
    | TimeRangeConfig
    | {
          start?: PersistedTimeBoundaryRecord | undefined;
          end?: PersistedTimeBoundaryRecord | undefined;
      };

export type PersistedTazBoardInfo = {
    id: string;
    type: string;
    version?: string | undefined;
    panels: PersistedTazPanelInfo[];
    boardTimeRange?: PersistedBoardTimeRange | undefined;
    name?: string | undefined;
    path?: string | undefined;
    code?: unknown;
    savedCode?: string | false | undefined;
    range_bgn?: PersistedTimeBoundaryInputValue | undefined;
    range_end?: PersistedTimeBoundaryInputValue | undefined;
    sheet?: unknown[] | undefined;
    shell?: unknown;
    dashboard?: unknown;
    refreshKey?: unknown;
    mode?: unknown;
};

export type PersistedTazBoardInfoV200 = {
    id: string;
    type: string;
    version: '2.0.0';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV200[];
};
