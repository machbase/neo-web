import type {
    PanelViewRange,
    PanelRangeInput,
    TimeRangeMs,
} from './time/model/TimeTypes';
import type { PanelSeriesDefinition } from './SeriesDomain';

export type ValueRange = {
    min: number | undefined;
    max: number | undefined;
};

export const DEFAULT_VALUE_RANGE: ValueRange = { min: 0, max: 0 };

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

export const DEFAULT_PANEL_QUERY_COUNT = 0;

export function normalizePanelQueryCount(count: unknown): number {
    return typeof count === 'number' && Number.isFinite(count)
        ? count
        : DEFAULT_PANEL_QUERY_COUNT;
}

export type PanelMode = {
    isRaw: boolean;
    isOrderBy: boolean;
    useNormalize: boolean;
};

export type PanelTimeRange = PanelRangeInput & {
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

export type PanelRightYAxis = PanelYAxis & {
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

export type RuntimeValueRange = {
    min: number;
    max: number;
};

export type RuntimePanelAxisThreshold = {
    enabled: boolean;
    value: number;
};

export type RuntimePanelXAxis = {
    showTickline: boolean;
    rawDataPixelsPerTick: number;
    calculatedDataPixelsPerTick: number;
    calculatedNavigatorPixelsPerTick: number;
};

export type RuntimePanelSampling = {
    enabled: boolean;
    sampleCount: number;
};

export type RuntimePanelYAxis = {
    zeroBase: boolean;
    showTickline: boolean;
    valueRange: RuntimeValueRange;
    rawValueRange: RuntimeValueRange;
    upperControlLimit: RuntimePanelAxisThreshold;
    lowerControlLimit: RuntimePanelAxisThreshold;
};

export type RuntimePanelAxes = {
    x: RuntimePanelXAxis;
    mainChartSampling: RuntimePanelSampling;
    leftY: RuntimePanelYAxis;
    rightY: RuntimePanelYAxis;
    rightYEnabled: boolean;
};

export type RuntimePanelDisplay = {
    chartType: PanelEChartType;
    showLegend: boolean;
    showPoint: boolean;
    pointRadius: number;
    fill: number;
    stroke: number;
    connectNulls: boolean;
    useZoom: boolean;
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

export type PanelInfo = {
    key: string;
    title: string;
    query: PanelQuery;
    mode: PanelMode;
    timeRange: PanelTimeRange;
    axes: PanelAxes;
    display: PanelDisplay;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export function resolvePanelAxesForRuntime(
    axes: PanelAxes,
    pixelsPerTick: PanelPixelsPerTick,
    mainChartSampling: PanelSampling,
): RuntimePanelAxes {
    return {
        x: {
            showTickline: axes.x.showTickline,
            rawDataPixelsPerTick: pixelsPerTick.raw ?? 0,
            calculatedDataPixelsPerTick: pixelsPerTick.calculated ?? 0,
            calculatedNavigatorPixelsPerTick: pixelsPerTick.calculatedNavigator ?? 0,
        },
        mainChartSampling: resolvePanelSamplingForRuntime(
            mainChartSampling,
            'main chart sampling',
        ),
        leftY: resolvePanelYAxisForRuntime(axes.leftY, 'left y-axis'),
        rightY: resolvePanelYAxisForRuntime(axes.rightY, 'right y-axis'),
        rightYEnabled: axes.rightY.enabled,
    };
}

export function resolvePanelDisplayForRuntime(
    display: PanelDisplay,
): RuntimePanelDisplay {
    return {
        chartType: display.chartType,
        showLegend: display.showLegend,
        showPoint: display.showPoint,
        connectNulls: display.connectNulls,
        useZoom: display.useZoom,
        pointRadius: display.pointRadius ?? 0,
        fill: display.fill ?? 0,
        stroke: display.stroke ?? 0,
    };
}

function resolvePanelSamplingForRuntime(
    sampling: PanelSampling,
    label: string,
): RuntimePanelSampling {
    if (sampling.enabled && sampling.sampleCount === undefined) {
        throw new Error(`${label} requires a sample count when enabled.`);
    }

    return {
        enabled: sampling.enabled,
        sampleCount: sampling.sampleCount ?? 0,
    };
}

function resolvePanelYAxisForRuntime(
    axis: PanelYAxis,
    label: string,
): RuntimePanelYAxis {
    return {
        zeroBase: axis.zeroBase,
        showTickline: axis.showTickline,
        valueRange: resolveValueRangeForRuntime(
            axis.valueRange,
            `${label} value range`,
        ),
        rawValueRange: resolveValueRangeForRuntime(
            axis.rawValueRange,
            `${label} raw value range`,
        ),
        upperControlLimit: resolveAxisThresholdForRuntime(
            axis.upperControlLimit,
            `${label} upper control limit`,
        ),
        lowerControlLimit: resolveAxisThresholdForRuntime(
            axis.lowerControlLimit,
            `${label} lower control limit`,
        ),
    };
}

function resolveValueRangeForRuntime(
    range: ValueRange,
    label: string,
): RuntimeValueRange {
    const sMin = range.min;
    const sMax = range.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;

    if (sHasMin !== sHasMax) {
        throw new Error(`${label} requires both min and max values.`);
    }

    if (!sHasMin || !sHasMax) {
        return { min: 0, max: 0 };
    }

    if (sMin !== 0 || sMax !== 0) {
        if (sMin >= sMax) {
            throw new Error(`${label} min must be less than max.`);
        }
    }

    return { min: sMin, max: sMax };
}

function resolveAxisThresholdForRuntime(
    threshold: PanelAxisThreshold,
    label: string,
): RuntimePanelAxisThreshold {
    if (threshold.enabled && threshold.value === undefined) {
        throw new Error(`${label} requires a value when enabled.`);
    }

    return {
        enabled: threshold.enabled,
        value: threshold.value ?? 0,
    };
}

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

export type PanelZoomActions = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelNavigatorShiftActions = {
    onShiftLeft: () => void;
    onShiftRight: () => void;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
};

export type PanelRangeActions = {
    applyMainZoomRange: (event: PanelRangeChangeEvent) => unknown;
    applyMainNavigatorSelectionRange: (event: PanelRangeChangeEvent) => unknown;
    applyExactMainRange: (event: PanelRangeChangeEvent) => unknown;
    applyExactNavigatorRange: (event: PanelRangeChangeEvent) => unknown;
    shiftMainRangeLeft: () => void;
    shiftMainRangeRight: () => void;
};

export type PanelRangeState = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
};

export type PanelDisplayRangeState = {
    displayPanelRange: TimeRangeMs;
    displayNavigatorRange: TimeRangeMs;
};

export type PanelPoint = {
    x: number;
    y: number;
};

type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelChartHandle = {
    getVisibleSeries: () => PanelVisibleSeriesItem[];
    isPointInsideMainGrid: (clientX: number, clientY: number) => boolean;
};

export type PanelChartState = {
    axes: RuntimePanelAxes;
    display: RuntimePanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    useOrderBy: boolean;
    highlights: PanelHighlight[];
    draftHighlight?: PanelHighlight | undefined;
    annotations: PanelAnnotation[];
};

export type PanelMarkupHandlers = {
    onOpenCreateAnnotation: (
        position: PanelPoint,
        seriesIndex: number | undefined,
        timestamp: number,
    ) => unknown;
    onActivateHighlightEditor: (
        position: PanelPoint,
        highlightIndex: number,
    ) => unknown;
    onActivateAnnotationEditor: (
        position: PanelPoint,
        annotationIndex: number,
    ) => unknown;
};

export type { TimeRangeMs };
