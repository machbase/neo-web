import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { IntervalOption, TimeRangeMs } from '../../domain/time/TimeTypes';
import type { PanelChartDataLoadConfig } from './panelChartLoadConfig';

export function buildSeriesCacheKey(
    seriesList: PanelSeriesDefinition[],
): string {
    return JSON.stringify(
        seriesList.map((s) => ({
            table: s.table,
            sourceTagName: s.sourceTagName,
            calculationMode: s.calculationMode,
            useRollupTable: s.useRollupTable,
            sourceColumns: s.sourceColumns,
        })),
    );
}

export function getMainFetchReuseKey(
    config: PanelChartDataLoadConfig,
    requestInterval: IntervalOption,
): string | undefined {
    if (config.isRaw) {
        return config.mainChartSampling.enabled
            ? JSON.stringify({
                  mode: 'raw-sampling',
                  sampleCount: config.mainChartSampling.sampleCount,
              })
            : undefined;
    }

    return JSON.stringify({
        mode: 'calculated',
        intervalType: requestInterval.IntervalType,
        intervalValue: requestInterval.IntervalValue,
    });
}

export function buildMainFetchBaseKey(
    config: PanelChartDataLoadConfig,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
): string {
    return JSON.stringify({
        ...buildSharedFetchBaseKeyFields(
            config,
            chartWidth,
            seriesKey,
            rollupKey,
            refreshVersion,
        ),
        useOrderBy: config.useOrderBy,
        calculatedPixelsPerTick: config.xAxis.calculatedDataPixelsPerTick,
        mainChartSampling: config.mainChartSampling,
    });
}

export function buildNavigatorFetchBaseKey(
    config: PanelChartDataLoadConfig,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
): string {
    return JSON.stringify({
        ...buildSharedFetchBaseKeyFields(
            config,
            chartWidth,
            seriesKey,
            rollupKey,
            refreshVersion,
        ),
        navigatorPixelsPerTick: config.xAxis.calculatedNavigatorPixelsPerTick,
        rawNavigatorSampling: config.rawNavigatorSampling,
    });
}

export function buildFetchCacheKey(
    variant: 'main' | 'navigator',
    config: PanelChartDataLoadConfig,
    range: TimeRangeMs,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
): string {
    const sShared = {
        queryLimit: config.queryLimit,
        intervalType: config.intervalType,
        isRaw: config.isRaw,
        rawPixelsPerTick: config.xAxis.rawDataPixelsPerTick,
        chartWidth,
        series: seriesKey,
        rollups: rollupKey,
        refreshVersion,
    };

    return JSON.stringify(
        variant === 'main'
            ? {
                  ...sShared,
                  useOrderBy: config.useOrderBy,
                  calculatedPixelsPerTick: config.xAxis.calculatedDataPixelsPerTick,
                  mainChartSampling: config.mainChartSampling,
                  requestPanelRange: range,
              }
            : {
                  ...sShared,
                  navigatorPixelsPerTick: config.xAxis.calculatedNavigatorPixelsPerTick,
                  rawNavigatorSampling: config.rawNavigatorSampling,
                  requestNavigatorRange: range,
              },
    );
}

function buildSharedFetchBaseKeyFields(
    config: PanelChartDataLoadConfig,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
) {
    return {
        queryLimit: config.queryLimit,
        intervalType: config.intervalType,
        isRaw: config.isRaw,
        rawPixelsPerTick: config.xAxis.rawDataPixelsPerTick,
        chartWidth,
        series: seriesKey,
        rollups: rollupKey,
        refreshVersion,
    };
}
