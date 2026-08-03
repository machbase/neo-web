import {
    getPanelSeriesDisplayName,
    getPanelSeriesEChartsName,
    type PanelSeriesDefinition,
} from '../seriesModel';
import type { PanelDataFetchResult } from '../api/seriesDataApi';
import type { AxisRange } from '../range/rangeModel';

export type ChartRow = [number, number | null];

export type ChartSeriesData = {
    name: string;
    echartsName?: string;
    data: ChartRow[];
    yAxis: number;
    marker:
        | {
              symbol: string | undefined;
              lineColor: string | undefined;
              lineWidth: number | undefined;
          }
        | undefined;
    color: string | undefined;
};

export type ChartSeriesVisibilityMap = Record<string, boolean>;

export function filterChartDataByRange(
    chartData: ChartSeriesData[],
    range: AxisRange,
): ChartSeriesData[] {
    return chartData.map((series) => ({
        ...series,
        data: series.data.filter(
            ([timestamp]) =>
                timestamp >= range.start && timestamp <= range.end,
        ),
    }));
}

export function getChartSeriesEChartsName(
    series: Pick<ChartSeriesData, 'name' | 'echartsName'>,
): string {
    return series.echartsName ?? series.name;
}

export function mapFetchResultToChartData(
    result: PanelDataFetchResult | undefined,
    seriesConfigSet: PanelSeriesDefinition[],
    isRaw: boolean,
    includeColor = true,
): ChartSeriesData[] {
    if (!result) {
        return [];
    }

    const sSeriesByKey = new Map(
        seriesConfigSet.map((seriesConfig) => [seriesConfig.key, seriesConfig]),
    );

    return result.map(({ data, seriesKey }) => {
        const sSeriesConfig = sSeriesByKey.get(seriesKey);
        if (!sSeriesConfig) {
            throw new Error(`Unknown panel data series: ${seriesKey}.`);
        }

        return {
            name: getPanelSeriesDisplayName(sSeriesConfig),
            echartsName: getPanelSeriesEChartsName(sSeriesConfig, isRaw),
            data: data.map(
                ([aTime, aValue]): ChartRow => [aTime, aValue],
            ),
            yAxis: sSeriesConfig.useSecondaryAxis ? 1 : 0,
            marker: {
                symbol: 'circle',
                lineColor: undefined,
                lineWidth: 1,
            },
            color: includeColor ? sSeriesConfig.color : undefined,
        };
    });
}
