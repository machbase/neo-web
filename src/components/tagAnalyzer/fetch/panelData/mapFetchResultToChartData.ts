import type { ChartRow, ChartSeriesData } from '../../domain/ChartDomain';
import {
    getPanelSeriesDisplayName,
    getPanelSeriesModeLabel,
    getPanelSeriesValueLabel,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type {
    FetchPanelSeriesRowsResult,
    TagFetchRow,
} from './PanelDataFetchTypes';

// Adapts panel series fetch results into the chart data model the chart option
// builders consume. Lives in the fetch layer (not domain) so the ChartDomain
// model stays free of fetch-result types.

function mapRowsToChartData(rows: TagFetchRow[]): ChartRow[] {
    if (rows.length === 0) {
        return [];
    }

    return rows.map(([aTime, aValue]) => [aTime, aValue]);
}

function buildChartSeriesData(
    seriesConfig: PanelSeriesDefinition,
    rows: ChartRow[],
    useRawLabel = false,
    includeColor = true,
): ChartSeriesData {
    const sSeriesMode = getPanelSeriesModeLabel(seriesConfig, useRawLabel);
    const sSeriesName = getPanelSeriesDisplayName(seriesConfig);

    return {
        name: sSeriesName,
        echartsName: buildEChartsSeriesName(seriesConfig, sSeriesMode),
        data: rows,
        yAxis: seriesConfig.useSecondaryAxis ? 1 : 0,
        marker: {
            symbol: 'circle',
            lineColor: undefined,
            lineWidth: 1,
        },
        color: includeColor ? seriesConfig.color : undefined,
    };
}

function buildEChartsSeriesName(
    seriesConfig: PanelSeriesDefinition,
    seriesMode: string,
): string {
    const sBaseName = [
        seriesConfig.table,
        seriesConfig.sourceTagName,
        getPanelSeriesValueLabel(seriesConfig),
    ]
        .filter((part) => part.trim().length > 0)
        .join(' / ');

    return sBaseName ? `${sBaseName} (${seriesMode})` : seriesMode;
}

export function mapFetchResultToChartData(
    result: FetchPanelSeriesRowsResult | undefined,
    options: { includeColor?: boolean } = {},
): ChartSeriesData[] {
    if (!result) {
        return [];
    }

    const sIncludeColor = options.includeColor !== false;

    return result.seriesFetchResults.map(({ fetchResult, seriesConfig }) =>
        buildChartSeriesData(
            seriesConfig,
            mapRowsToChartData(fetchResult.data.rows),
            result.isRaw,
            sIncludeColor,
        ),
    );
}
