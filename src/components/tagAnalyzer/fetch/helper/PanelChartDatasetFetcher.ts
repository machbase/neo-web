import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type { PanelAxes, PanelData, PanelTime } from '../../domain/PanelModel';
import type { ChartSeriesData } from '../../chart/ChartTypes';
import { calculateInterval } from '../../chart/ChartIntervalUtils';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import {
    getIntervalMs,
    normalizeStoredTimeUnit,
} from '../../time/TimeUnitUtils';
import {
    resolvePanelOrBoardTimeRange,
} from '../../time/TimeRangeResolution';
import { isConcreteTimeRange } from '../../time/TimeRangeUtils';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../../time/TimeTypes';
import { addAdminSchemaIfNeeded } from './TableNameSchema';
import { chartSeriesDataApi } from '../ChartSeriesDataFetcher';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    FetchPanelDatasetsResult,
    RawFetchRequest,
    RawFetchSampling,
} from '../FetchContracts';
import { SortOrderEnum } from '../FetchContracts';
import {
    buildChartSeriesData,
    mapRowsToChartData,
} from './ChartSeriesMapper';

const EMPTY_CHART_FETCH_RESPONSE: ChartFetchResponse = {
    data: {
        column: [],
        rows: [],
    },
};

const EMPTY_FETCH_PANEL_DATASETS_RESULT: FetchPanelDatasetsResult = {
    datasets: [],
    interval: {
        IntervalType: '',
        IntervalValue: 0,
    },
    count: 0,
};

export function calculateSampleCount(
    limit: number,
    useSampling: boolean,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    chartWidth: number,
): number {
    if (isRaw && !useSampling) {
        return -1;
    }

    if (limit >= 0) {
        return -1;
    }

    const sPixelsPerTick = useSampling && isRaw
        ? pixelsPerTickRaw
        : pixelsPerTick;

    return calculatePixelLimitedCount(chartWidth, sPixelsPerTick);
}

function calculatePixelLimitedCount(chartWidth: number, pixelsPerTick: number): number {
    return Math.ceil(chartWidth / (pixelsPerTick > 0 ? pixelsPerTick : 1));
}

export function resolveRawFetchSampling(
    useSampling: boolean,
    samplingValue: number,
): RawFetchSampling {
    return useSampling
        ? {
              kind: 'enabled',
              value: samplingValue,
          }
        : { kind: 'disabled' };
}

export function isFetchableTimeRange(
    timeRange: TimeRangeMs | undefined,
): timeRange is TimeRangeMs {
    return isConcreteTimeRange(timeRange);
}

export function resolvePanelFetchTimeRange(
    panelTime: PanelTime,
    boardTime: TimeRangeConfig | undefined,
    timeRange: TimeRangeMs | undefined,
): TimeRangeMs {
    if (timeRange) {
        return timeRange;
    }

    return resolvePanelOrBoardTimeRange(panelTime, boardTime);
}

export function resolvePanelFetchInterval(
    panelData: PanelData,
    axes: PanelAxes,
    timeRange: TimeRangeMs,
    chartWidth: number,
    isRaw: boolean,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        isRaw,
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

export async function fetchCalculatedSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs,
    interval: IntervalOption,
    count: number,
    rollupTableList: string[],
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(timeRange)) {
        return EMPTY_CHART_FETCH_RESPONSE;
    }

    const sourceColumns = seriesConfig.sourceColumns;
    const request: CalculationFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: seriesConfig.sourceTagName,
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: isRollup(
            rollupTableList,
            seriesConfig.table,
            getIntervalMs(interval.IntervalType, interval.IntervalValue),
            sourceColumns.value,
            sourceColumns.jsonKey,
        ),
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
        RollupList: rollupTableList,
    };

    return (await chartSeriesDataApi.fetchCalculationData(request)) as ChartFetchResponse;
}

export async function fetchRawSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs,
    interval: IntervalOption,
    count: number,
    sampling: RawFetchSampling,
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(timeRange)) {
        return EMPTY_CHART_FETCH_RESPONSE;
    }

    const sourceColumns = seriesConfig.sourceColumns;
    const request: RawFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: seriesConfig.sourceTagName,
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: seriesConfig.useRollupTable,
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
        SortOrder: SortOrderEnum.Ascending,
        sampling: sampling,
    };

    return (await chartSeriesDataApi.fetchRawData(request)) as ChartFetchResponse;
}

export async function fetchPanelDatasets(
    seriesConfigSet: PanelSeriesDefinition[],
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: TimeRangeConfig | undefined,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
    useSampling: boolean,
): Promise<FetchPanelDatasetsResult> {
    const count = calculateSampleCount(
        panelData.count,
        useSampling,
        isRaw,
        panelAxes.x_axis.calculated_data_pixels_per_tick,
        panelAxes.x_axis.raw_data_pixels_per_tick,
        chartWidth,
    );
    const timeRangeToFetch = resolvePanelFetchTimeRange(
        panelTime,
        boardTime,
        timeRange,
    );
    if (!isFetchableTimeRange(timeRangeToFetch)) {
        return EMPTY_FETCH_PANEL_DATASETS_RESULT;
    }

    const interval = resolvePanelFetchInterval(
        panelData,
        panelAxes,
        timeRangeToFetch,
        chartWidth,
        isRaw,
    );
    const seriesFetchResults = await fetchPanelSeriesResults(
        seriesConfigSet,
        timeRangeToFetch,
        interval,
        count,
        isRaw,
        useSampling,
        panelAxes.sampling.sample_count,
        rollupTableList,
    );

    const datasets: ChartSeriesData[] = [];

    for (const { seriesConfig, fetchResult } of seriesFetchResults) {
        const rows = fetchResult?.data?.rows;

        datasets.push(
            buildChartSeriesData(seriesConfig, mapRowsToChartData(rows), isRaw),
        );
    }

    return {
        datasets: datasets,
        interval: interval,
        count: count,
    };
}

type PanelSeriesFetchResult = {
    seriesConfig: PanelSeriesDefinition;
    fetchResult: ChartFetchResponse;
};

async function fetchPanelSeriesResults(
    seriesConfigSet: PanelSeriesDefinition[],
    timeRange: TimeRangeMs,
    interval: FetchPanelDatasetsResult['interval'],
    count: number,
    isRaw: boolean,
    useSampling: boolean,
    sampleCount: number,
    rollupTableList: string[],
): Promise<PanelSeriesFetchResult[]> {
    const sRawSampling = resolveRawFetchSampling(useSampling, sampleCount);

    return Promise.all(
        seriesConfigSet.map(async (seriesConfig) => ({
            seriesConfig: seriesConfig,
            fetchResult: isRaw
                ? await fetchRawSeriesRows(
                    seriesConfig,
                    timeRange,
                    interval,
                    count,
                    sRawSampling,
                )
                : await fetchCalculatedSeriesRows(
                    seriesConfig,
                    timeRange,
                    interval,
                    count,
                    rollupTableList,
                ),
        })),
    );
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

