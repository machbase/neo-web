import type {
    PanelViewRange,
    PanelRangeInput,
    TimeRangeInput,
    TimeRangeMs,
} from '../time/TimeTypes';
import type { PanelSeriesDefinition } from '../SeriesDomain';

export type ValueRange = {
    min: number | undefined;
    max: number | undefined;
};

export const AUTO_VALUE_RANGE: ValueRange = {
    min: undefined,
    max: undefined,
};

const PANEL_ECHART_TYPE_VALUES = ['Line', 'Zone', 'Dot', 'Custom'] as const;

export type PanelEChartType = (typeof PANEL_ECHART_TYPE_VALUES)[number];

const DEFAULT_PANEL_ECHART_TYPE: PanelEChartType = 'Line';
const PANEL_ECHART_TYPE_LOOKUP: Record<PanelEChartType, true> = {
    Line: true,
    Zone: true,
    Dot: true,
    Custom: true,
};

function isPanelEChartType(value: unknown): value is PanelEChartType {
    return typeof value === 'string' && value in PANEL_ECHART_TYPE_LOOKUP;
}

export function normalizePanelEChartType(value: unknown): PanelEChartType {
    return isPanelEChartType(value) ? value : DEFAULT_PANEL_ECHART_TYPE;
}

export type PanelQuery = {
    tagSet: PanelSeriesDefinition[];
    count: number;
    intervalType: string | undefined;
};

const DEFAULT_PANEL_QUERY_COUNT = 0;

export function normalizePanelQueryCount(count: unknown): number {
    return typeof count === 'number' && Number.isFinite(count)
        ? count
        : DEFAULT_PANEL_QUERY_COUNT;
}

type PanelMode = {
    isRaw: boolean;
    isOrderBy: boolean;
    useNormalize: boolean;
};

export type PanelTimeConfig = {
    rangeInput: PanelRangeInput;
    useLastViewedRange: boolean;
    lastViewedRange: PanelViewRange | undefined;
};

export type PanelAxisThreshold = {
    enabled: boolean;
    value: number | undefined;
};

export type PanelXAxis = {
    showTickline: boolean;
};

export type PanelSampling = {
    enabled: boolean;
    sampleCount: number | undefined;
};

export const DEFAULT_RAW_NAVIGATOR_SAMPLING_VALUE = 0.01;

export const DEFAULT_RAW_NAVIGATOR_SAMPLING: PanelSampling = {
    enabled: false,
    sampleCount: DEFAULT_RAW_NAVIGATOR_SAMPLING_VALUE,
};

export type PanelYAxis = {
    zeroBase: boolean;
    showTickline: boolean;
    valueRange: ValueRange;
    rawValueRange: ValueRange;
    upperControlLimit: PanelAxisThreshold;
    lowerControlLimit: PanelAxisThreshold;
};

type PanelRightYAxis = PanelYAxis & {
    enabled: boolean;
};

export type PanelAxes = {
    x: PanelXAxis;
    leftY: PanelYAxis;
    rightY: PanelRightYAxis;
};

export type PanelPixelsPerTick = {
    raw: number | undefined;
    calculated: number | undefined;
    calculatedNavigator: number | undefined;
};

export type PanelDisplay = {
    chartType: PanelEChartType;
    showLegend: boolean;
    showPoint: boolean;
    pointRadius: number | undefined;
    fill: number | undefined;
    stroke: number | undefined;
    connectNulls: boolean;
    useZoom: boolean;
    pixelsPerTick: PanelPixelsPerTick;
    mainChartSampling: PanelSampling;
    rawNavigatorSampling: PanelSampling;
};

export const DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_LABEL = 'unnamed';

export type PanelHighlight = {
    text: string;
    timeRange: TimeRangeMs;
    fillColor: string;
    textColor: string;
};

export type PanelAnnotation = {
    seriesKey: string;
    text: string;
    timeRange: TimeRangeMs;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

export type PanelConfig = {
    key: string;
    title: string;
    query: PanelQuery;
    mode: PanelMode;
    time: PanelTimeConfig;
    axes: PanelAxes;
    display: PanelDisplay;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export type PanelInfo = PanelConfig;

export type PanelRangeState = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    requestNavigatorRangeInput?: TimeRangeInput;
    fullRange: TimeRangeMs;
};

export type RuntimePanelTime = {
    config: PanelTimeConfig;
    runtimeRange: PanelRangeState;
};

export type RuntimePanelInfo = Omit<PanelConfig, 'time'> & {
    time: RuntimePanelTime;
    isOverlapSelected: boolean;
};

export function createRuntimePanelInfo(
    panelConfig: PanelConfig,
    runtimeRange: PanelRangeState,
    isOverlapSelected: boolean,
): RuntimePanelInfo {
    return {
        ...panelConfig,
        time: {
            config: panelConfig.time,
            runtimeRange,
        },
        isOverlapSelected,
    };
}

export function getPanelConfigFromRuntimePanel(
    runtimePanelInfo: RuntimePanelInfo,
): PanelConfig {
    return {
        key: runtimePanelInfo.key,
        title: runtimePanelInfo.title,
        query: runtimePanelInfo.query,
        mode: runtimePanelInfo.mode,
        time: runtimePanelInfo.time.config,
        axes: runtimePanelInfo.axes,
        display: runtimePanelInfo.display,
        highlights: runtimePanelInfo.highlights,
        annotations: runtimePanelInfo.annotations,
    };
}

export type PanelDisplayRangeState = {
    displayPanelRange: TimeRangeMs;
    displayNavigatorRange: TimeRangeMs;
    isDefaultNavigatorRange: boolean;
};
