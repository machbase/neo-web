import type {
    PanelAxes,
    PanelData,
    PanelSampling,
} from './PanelModel';
import { isConcreteTimeRange } from './time/TimeRangeUtils';
import {
    normalizeStoredTimeUnit,
} from './time/TimeUnitUtils';
import {
    calculateInterval,
    calculateSampleCount,
    getIntervalMs,
} from './time/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeMs,
} from './time/TimeTypes';

export type PanelDatasetLoadPurpose = 'main' | 'navigator';

export type PanelSeriesFetchPlan = {
    timeRange: TimeRangeMs;
    interval: IntervalOption;
    count: number;
    isRaw: boolean;
    useRawSampling: boolean;
    sampleCount: number;
};

export function resolvePanelSeriesFetchPlan({
    panelData,
    panelAxes,
    chartWidth,
    requestedRawMode,
    timeRange,
    loadPurpose,
}: {
    panelData: PanelData;
    panelAxes: PanelAxes;
    chartWidth: number;
    requestedRawMode: boolean;
    timeRange: TimeRangeMs;
    loadPurpose: PanelDatasetLoadPurpose;
}): PanelSeriesFetchPlan | undefined {
    const sPurposeSampling = resolvePurposeSampling(
        panelAxes,
        loadPurpose,
    );
    const sFetchRawMode = resolveFetchRawMode(
        requestedRawMode,
        sPurposeSampling.enabled,
        loadPurpose,
    );
    if (!isConcreteTimeRange(timeRange)) {
        return undefined;
    }

    return {
        timeRange: timeRange,
        interval: resolvePanelFetchInterval(
            panelData,
            panelAxes,
            timeRange,
            chartWidth,
            sFetchRawMode,
        ),
        count: calculateSampleCount(
            panelData.count,
            sFetchRawMode,
            panelAxes.x_axis.calculated_data_pixels_per_tick,
            panelAxes.x_axis.raw_data_pixels_per_tick,
            chartWidth,
        ),
        isRaw: sFetchRawMode,
        useRawSampling: requestedRawMode && sFetchRawMode && sPurposeSampling.enabled,
        sampleCount: sPurposeSampling.sample_count,
    };
}

function resolveFetchRawMode(
    requestedRawMode: boolean,
    useSampling: boolean,
    loadPurpose: PanelDatasetLoadPurpose,
): boolean {
    if (!requestedRawMode) {
        return false;
    }

    return loadPurpose === 'main' || useSampling;
}

function resolvePurposeSampling(
    panelAxes: PanelAxes,
    loadPurpose: PanelDatasetLoadPurpose,
): PanelSampling {
    const sPurposeSampling = loadPurpose === 'main'
        ? panelAxes.main_chart_sampling
        : panelAxes.sampling;

    return loadPurpose === 'navigator'
        ? {
              ...sPurposeSampling,
              enabled: true,
          }
        : sPurposeSampling;
}

function resolvePanelFetchInterval(
    panelData: PanelData,
    axes: PanelAxes,
    timeRange: TimeRangeMs,
    chartWidth: number,
    fetchRawMode: boolean,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        fetchRawMode,
        axes.x_axis.calculated_data_pixels_per_tick,
        axes.x_axis.raw_data_pixels_per_tick,
        false,
    );
    const intervalType = panelData.interval_type?.toLowerCase() ?? '';

    if (intervalType === '') {
        return calculatedInterval;
    }

    const explicitInterval = resolveExplicitFetchInterval(
        normalizeStoredTimeUnit(intervalType) ?? intervalType,
        calculatedInterval,
    );

    return explicitInterval ?? calculatedInterval;
}

function resolveExplicitFetchInterval(
    intervalType: string,
    calculatedInterval: IntervalOption,
): IntervalOption | undefined {
    const intervalUnitMs = getIntervalMs(intervalType, 1);
    if (intervalUnitMs <= 0) {
        return undefined;
    }

    const calculatedIntervalMs = getIntervalMs(
        calculatedInterval.IntervalType,
        calculatedInterval.IntervalValue,
    );
    if (calculatedIntervalMs <= 0) {
        return {
            IntervalType: intervalType,
            IntervalValue: 1,
        };
    }

    return {
        IntervalType: intervalType,
        IntervalValue: Math.max(1, Math.ceil(calculatedIntervalMs / intervalUnitMs)),
    };
}
