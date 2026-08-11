import type { PanelSeriesDefinition } from '../seriesModel';
import type { TimeUnit } from '../range/intervalResolver';
import type {
    AxisRange,
    RangeState,
    RangeExpressionInput,
} from '../range/rangeModel';

export type ValueRange = {
    min: number | undefined;
    max: number | undefined;
};

export const AUTO_VALUE_RANGE: ValueRange = {
    min: undefined,
    max: undefined,
};

export function isValueRangeInvalid(range: ValueRange): boolean {
    const { min, max } = range;

    if (min === undefined || max === undefined) {
        return min !== max;
    }

    return !Number.isFinite(min) || !Number.isFinite(max) || min >= max;
}

export const PANEL_ECHART_TYPE_VALUES = ['Line', 'Zone', 'Dot', 'Custom'] as const;

export type PanelEChartType = (typeof PANEL_ECHART_TYPE_VALUES)[number];

export type PanelAxisThreshold = {
    enabled: boolean;
    value: number | undefined;
};

export type PanelSampling = {
    enabled: boolean;
    sampleCount: number | undefined;
};

export const DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT = 0.01;

export const DEFAULT_RAW_NAVIGATOR_SAMPLING: PanelSampling = {
    enabled: false,
    sampleCount: DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
};

export type PanelYAxis = {
    zeroBase: boolean;
    showTickline: boolean;
    valueRange: ValueRange;
    rawValueRange: ValueRange;
    upperControlLimit: PanelAxisThreshold;
    lowerControlLimit: PanelAxisThreshold;
};

export type PanelAxes = {
    x: { showTickline: boolean };
    leftY: PanelYAxis;
    rightY: PanelYAxis & { enabled: boolean };
};

export function clonePanelYAxis<T extends PanelYAxis>(axis: T): T {
    return {
        ...axis,
        valueRange: { ...axis.valueRange },
        rawValueRange: { ...axis.rawValueRange },
        upperControlLimit: { ...axis.upperControlLimit },
        lowerControlLimit: { ...axis.lowerControlLimit },
    };
}

export type PanelDisplay = {
    chartType: PanelEChartType;
    showLegend: boolean;
    showPoint: boolean;
    pointRadius: number | undefined;
    fill: number | undefined;
    stroke: number | undefined;
    connectNulls: boolean;
    useZoom: boolean;
    pixelsPerTick: {
        calculated: number | undefined;
        calculatedNavigator: number | undefined;
    };
    mainChartSampling: PanelSampling;
    rawNavigatorSampling: PanelSampling;
};

function isInvalidThreshold(threshold: PanelAxisThreshold): boolean {
    return (
        threshold.enabled &&
        (threshold.value === undefined || !Number.isFinite(threshold.value))
    );
}

function isInvalidYAxis(axis: PanelYAxis): boolean {
    return (
        isValueRangeInvalid(axis.valueRange) ||
        isValueRangeInvalid(axis.rawValueRange) ||
        isInvalidThreshold(axis.upperControlLimit) ||
        isInvalidThreshold(axis.lowerControlLimit)
    );
}

function isInvalidOptionalPositiveNumber(
    value: number | undefined,
): boolean {
    return value !== undefined && (!Number.isFinite(value) || value <= 0);
}

function isInvalidSampling(sampling: PanelSampling): boolean {
    return (
        sampling.enabled &&
        (sampling.sampleCount === undefined ||
            !Number.isFinite(sampling.sampleCount) ||
            sampling.sampleCount <= 0)
    );
}

export function hasInvalidPanelSettings(
    axes: PanelAxes,
    display: PanelDisplay,
): boolean {
    return (
        isInvalidYAxis(axes.leftY) ||
        (axes.rightY.enabled && isInvalidYAxis(axes.rightY)) ||
        [display.pointRadius, display.fill, display.stroke].some(
            (value) => value !== undefined && !Number.isFinite(value),
        ) ||
        isInvalidOptionalPositiveNumber(display.pixelsPerTick.calculated) ||
        isInvalidOptionalPositiveNumber(
            display.pixelsPerTick.calculatedNavigator,
        ) ||
        isInvalidSampling(display.mainChartSampling) ||
        isInvalidSampling(display.rawNavigatorSampling)
    );
}

export const DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_LABEL = 'unnamed';

export type PanelHighlight = {
    text: string;
    timeRange: AxisRange;
    fillColor: string;
    textColor: string;
};

export function createPanelHighlightDraft(
    timeRange: AxisRange,
): PanelHighlight {
    return {
        text: DEFAULT_PANEL_HIGHLIGHT_LABEL,
        timeRange: { ...timeRange },
        fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
        textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    };
}

export type PanelAnnotation = PanelHighlight & {
    seriesKey: string;
    clip: boolean;
};

export type PanelInfo = {
    key: string;
    title: string;
    isOverlapSelected: boolean;
    query: {
        tagSet: PanelSeriesDefinition[];
        intervalType: TimeUnit | undefined;
    };
    mode: {
        isRaw: boolean;
        isOrderBy: boolean;
        useNormalize: boolean;
    };
    time: {
        rangeInput: RangeExpressionInput;
        useLastViewedRange: boolean;
        lastViewedRange: RangeState | undefined;
    };
    axes: PanelAxes;
    display: PanelDisplay;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export const DEFAULT_NEW_PANEL_TITLE = 'New chart';

const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;
const DEFAULT_SAMPLING_VALUE = 0.01;
export const PANEL_DISPLAY_PRESETS = {
    Line: { showPoint: true, pointRadius: 0, fill: 0, stroke: 1 },
    Zone: { showPoint: false, pointRadius: 0, fill: 0.15, stroke: 1 },
    Dot: { showPoint: true, pointRadius: 2, fill: 0, stroke: 0 },
    Custom: { showPoint: true, pointRadius: 0, fill: 0, stroke: 1 },
};

export function createNewPanelInfo(
    selectedSeries: PanelSeriesDefinition[],
    chartName: string,
    chartType: PanelEChartType,
): PanelInfo {
    return {
        key: createPanelIndexKey(),
        title: chartName.trim() || DEFAULT_NEW_PANEL_TITLE,
        isOverlapSelected: false,
        query: {
            tagSet: selectedSeries.map((series) => ({
                ...series,
                sourceColumns: { ...series.sourceColumns },
            })),
            intervalType: undefined,
        },
        mode: {
            isRaw: false,
            isOrderBy: false,
            useNormalize: false,
        },
        time: {
            rangeInput: { start: '', end: '' },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: { showTickline: true },
            leftY: createYAxis(false),
            rightY: { ...createYAxis(true), enabled: false },
        },
        display: {
            chartType,
            showLegend: true,
            ...PANEL_DISPLAY_PRESETS[chartType],
            connectNulls: false,
            useZoom: true,
            pixelsPerTick: {
                calculated: DEFAULT_CALCULATED_PIXELS_PER_TICK,
                calculatedNavigator: DEFAULT_CALCULATED_PIXELS_PER_TICK,
            },
            mainChartSampling: {
                enabled: false,
                sampleCount: DEFAULT_SAMPLING_VALUE,
            },
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: [],
        annotations: [],
    };
}

function createYAxis(zeroBase: boolean): PanelYAxis {
    return {
        zeroBase,
        showTickline: true,
        valueRange: { ...AUTO_VALUE_RANGE },
        rawValueRange: { ...AUTO_VALUE_RANGE },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    };
}

let runtimePanelKeyCounter = 0;

function createPanelIndexKey(): string {
    runtimePanelKeyCounter += 1;
    return globalThis.crypto?.randomUUID?.() ?? `panel-${runtimePanelKeyCounter}`;
}

export function ensureUniquePanelKeys(panels: PanelInfo[]): PanelInfo[] {
    const usedPanelKeys = new Set<string>();
    const nextPanels = panels.map((panel) => {
        if (panel.key.trim() && !usedPanelKeys.has(panel.key)) {
            usedPanelKeys.add(panel.key);
            return panel;
        }

        let key = createPanelIndexKey();
        while (usedPanelKeys.has(key)) key = createPanelIndexKey();
        usedPanelKeys.add(key);
        return { ...panel, key };
    });

    return nextPanels.some((panel, index) => panel !== panels[index])
        ? nextPanels
        : panels;
}
