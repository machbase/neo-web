import type { PanelInfo } from '../../domain/panel/PanelConfig';
import type {
    RuntimePanelSampling,
    RuntimePanelXAxis,
} from '../../domain/panel/PanelRuntime';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import { isValidTimeRange } from '../../domain/time/TimeRangeUtils';
import { RAW_NAVIGATOR_SAMPLING_VALUE } from '../../fetch/panelData/PanelSeriesDataRepository';

export type PanelChartDataLoadConfig = {
    seriesList: PanelSeriesDefinition[];
    queryLimit: number;
    intervalType: string | undefined;
    isRaw: boolean;
    useOrderBy: boolean;
    xAxis: RuntimePanelXAxis;
    mainChartSampling: RuntimePanelSampling;
    rawNavigatorSampling: RuntimePanelSampling;
};

export function buildLoadConfig(panelInfo: PanelInfo): PanelChartDataLoadConfig {
    const sPixelsPerTick = panelInfo.display.pixelsPerTick;
    const sSampling = panelInfo.display.mainChartSampling;
    const sRawNavigatorSampling = panelInfo.display.rawNavigatorSampling;

    return {
        seriesList: panelInfo.query.tagSet,
        queryLimit: panelInfo.query.count,
        intervalType: panelInfo.query.intervalType,
        isRaw: panelInfo.mode.isRaw,
        useOrderBy: panelInfo.mode.isRaw ? panelInfo.mode.isOrderBy : true,
        xAxis: {
            showTickline: false,
            rawDataPixelsPerTick: sPixelsPerTick.raw ?? 0,
            calculatedDataPixelsPerTick: sPixelsPerTick.calculated ?? 0,
            calculatedNavigatorPixelsPerTick:
                sPixelsPerTick.calculatedNavigator ?? 0,
        },
        mainChartSampling: {
            enabled: sSampling.enabled,
            sampleCount: sSampling.sampleCount ?? 0,
        },
        rawNavigatorSampling: {
            enabled: sRawNavigatorSampling.enabled,
            sampleCount: sRawNavigatorSampling.sampleCount ??
                RAW_NAVIGATOR_SAMPLING_VALUE,
        },
    };
}

export function resolveChartWidth(chartAreaWidth: number | undefined): number {
    return chartAreaWidth !== undefined && chartAreaWidth > 0 ? chartAreaWidth : 1;
}

export function isReadyToFetch({
    chartAreaWidth,
    panelRange,
    navigatorRange,
    fullRange,
}: {
    chartAreaWidth: number | undefined;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
}): boolean {
    return (
        chartAreaWidth !== undefined &&
        isValidTimeRange(panelRange) &&
        isValidTimeRange(navigatorRange) &&
        isValidTimeRange(fullRange)
    );
}
