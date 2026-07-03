import { AUTO_VALUE_RANGE } from './PanelConfig';
import type {
    PanelAxes,
    PanelAxisThreshold,
    PanelDisplay,
    PanelEChartType,
    PanelPixelsPerTick,
    PanelSampling,
    PanelYAxis,
    ValueRange,
} from './PanelConfig';

type RuntimeValueRange = ValueRange;

type RuntimePanelAxisThreshold = {
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

type RuntimePanelYAxis = {
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
        return { ...AUTO_VALUE_RANGE };
    }

    if (!Number.isFinite(sMin) || !Number.isFinite(sMax)) {
        throw new Error(`${label} min and max must be finite numbers.`);
    }

    if (sMin >= sMax) {
        throw new Error(`${label} min must be less than max.`);
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
