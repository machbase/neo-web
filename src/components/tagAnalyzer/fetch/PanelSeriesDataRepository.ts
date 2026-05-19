import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type {
    PanelSampling,
    PanelXAxis,
} from '../domain/PanelModel';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    calculateInterval,
    calculateSampleCount,
    getIntervalMs,
} from '../domain/time/TimeIntervalUtils';
import { normalizeStoredTimeUnit } from '../domain/time/TimeUnitUtils';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { addAdminSchemaIfNeeded } from './TableNameSchema';
import {
    fetchCalculationData,
    fetchRawData,
} from './ChartSeriesDataFetcher';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    FetchPanelSeriesRowsResult,
    PanelSeriesFetchResult,
    RawFetchRequest,
    RawFetchSampling,
} from './FetchContracts';
import { SortOrderEnum } from './FetchContracts';

const EMPTY_CHART_FETCH_RESPONSE: ChartFetchResponse = {
    data: {
        column: [],
        rows: [],
    },
};

export async function fetchMainPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    queryLimit: number,
    intervalType: string | undefined,
    xAxis: PanelXAxis,
    mainChartSampling: PanelSampling,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<FetchPanelSeriesRowsResult | undefined> {
    return fetchResolvedPanelSeriesRows(
        seriesConfigSet,
        queryLimit,
        intervalType,
        xAxis,
        chartWidth,
        requestedRawMode,
        requestedRawMode && mainChartSampling.enabled,
        mainChartSampling.sample_count,
        timeRange,
        rollupTableList,
    );
}

export async function fetchNavigatorPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    queryLimit: number,
    intervalType: string | undefined,
    xAxis: PanelXAxis,
    navigatorSampling: PanelSampling,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<FetchPanelSeriesRowsResult | undefined> {
    return fetchResolvedPanelSeriesRows(
        seriesConfigSet,
        queryLimit,
        intervalType,
        xAxis,
        chartWidth,
        requestedRawMode,
        requestedRawMode,
        navigatorSampling.sample_count,
        timeRange,
        rollupTableList,
    );
}

async function fetchResolvedPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    queryLimit: number,
    intervalType: string | undefined,
    xAxis: PanelXAxis,
    chartWidth: number,
    isRaw: boolean,
    useSampling: boolean,
    sampleCount: number,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isConcreteTimeRange(timeRange)) {
        return undefined;
    }

    const interval = resolvePanelFetchInterval(
        intervalType,
        xAxis,
        timeRange,
        chartWidth,
        isRaw,
    );
    const count = calculateSampleCount(
        queryLimit,
        isRaw,
        xAxis.calculated_data_pixels_per_tick,
        xAxis.raw_data_pixels_per_tick,
        chartWidth,
    );

    return {
        seriesFetchResults: await fetchPanelSeriesRows({
            seriesConfigSet: seriesConfigSet,
            timeRange: timeRange,
            interval: interval,
            count: count,
            isRaw: isRaw,
            useSampling: useSampling,
            sampleCount: sampleCount,
            rollupTableList: rollupTableList,
        }),
        interval: interval,
        count: count,
        isRaw: isRaw,
    };
}

async function fetchPanelSeriesRows({
    seriesConfigSet,
    timeRange,
    interval,
    count,
    isRaw,
    useSampling,
    sampleCount,
    rollupTableList,
}: {
    seriesConfigSet: PanelSeriesDefinition[];
    timeRange: TimeRangeMs | undefined;
    interval: IntervalOption;
    count: number;
    isRaw: boolean;
    useSampling: boolean;
    sampleCount: number;
    rollupTableList: string[];
}): Promise<PanelSeriesFetchResult[]> {
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

function resolveRawFetchSampling(
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

function resolvePanelFetchInterval(
    intervalType: string | undefined,
    xAxis: PanelXAxis,
    timeRange: TimeRangeMs,
    chartWidth: number,
    fetchRawMode: boolean,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        fetchRawMode,
        xAxis.calculated_data_pixels_per_tick,
        xAxis.raw_data_pixels_per_tick,
        false,
    );
    const sIntervalType = intervalType?.toLowerCase() ?? '';

    if (sIntervalType === '') {
        return calculatedInterval;
    }

    const explicitInterval = resolveExplicitFetchInterval(
        normalizeStoredTimeUnit(sIntervalType) ?? sIntervalType,
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

export async function fetchCalculatedSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs | undefined,
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

    return (await fetchCalculationData(request)) as ChartFetchResponse;
}

export async function fetchRawSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs | undefined,
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

    return (await fetchRawData(request)) as ChartFetchResponse;
}
