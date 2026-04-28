import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { ChartSeriesData, PanelSeriesDefinition } from '../series/PanelSeriesTypes';
import {
    calculateInterval,
    convertIntervalUnit,
    getIntervalMs,
} from '../time/IntervalUtils';
import {
    normalizeBoardTimeRangeInput,
    normalizePanelTimeRangeSource,
    setTimeRange,
} from '../time/PanelTimeRangeResolver';
import { isConcreteTimeRange } from '../time/TimeBoundaryParsing';
import type {
    InputTimeBounds,
    IntervalOption,
    TimeRangeMs,
} from '../time/types/TimeTypes';
import { addAdminSchemaIfNeeded } from './AdminSchemaTableName';
import { tagAnalyzerDataApi } from './TagAnalyzerDataRepository';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    FetchPanelDatasetsResult,
    PanelDataLimitState,
    RawFetchRequest,
    RawFetchSampling,
    TagFetchRow,
} from './FetchTypes';
import {
    buildChartSeriesData,
    mapRowsToChartData,
} from './parsing/ChartSeriesMapper';
import { getSourceTagName } from '../series/PanelSeriesSourceTag';

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
    hasDataLimit: false,
    limitEnd: 0,
};

export function calculateSampleCount(
    limit: number,
    useSampling: boolean,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    chartWidth: number,
): number {
    if (limit >= 0) {
        return -1;
    }

    const sampledPixelsPerTick = useSampling && isRaw
        ? pixelsPerTickRaw > 0
            ? pixelsPerTickRaw
            : 1
        : pixelsPerTick > 0
          ? pixelsPerTick
          : 1;

    return Math.ceil(chartWidth / sampledPixelsPerTick);
}

export function isFetchableTimeRange(
    timeRange: TimeRangeMs | undefined,
): timeRange is TimeRangeMs {
    return isConcreteTimeRange(timeRange);
}

export function resolvePanelFetchTimeRange(
    panelTime: PanelTime,
    boardTime: InputTimeBounds,
    timeRange: TimeRangeMs | undefined,
): TimeRangeMs {
    if (timeRange) {
        return timeRange;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(panelTime),
        normalizeBoardTimeRangeInput(boardTime),
    );
}

export function resolveRawFetchSampling(
    useSampling: boolean,
    samplingValue: number,
): RawFetchSampling {
    if (!useSampling) {
        return { kind: 'disabled' };
    }

    return {
        kind: 'enabled',
        value: samplingValue,
    };
}

export function resolvePanelFetchInterval(
    panelData: PanelData,
    axes: PanelAxes,
    timeRange: TimeRangeMs,
    chartWidth: number,
    isRaw: boolean,
    isNavigator = false,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        isRaw,
        axes.x_axis.calculated_data_pixels_per_tick,
        axes.x_axis.raw_data_pixels_per_tick,
        isNavigator,
    );
    const intervalType = panelData.interval_type?.toLowerCase() ?? '';

    if (intervalType === '') {
        return calculatedInterval;
    }

    const explicitInterval = resolveExplicitFetchInterval(
        convertIntervalUnit(intervalType),
        calculatedInterval,
    );

    return explicitInterval ?? calculatedInterval;
}

export function analyzePanelDataLimit(
    isRaw: boolean,
    rows: TagFetchRow[] | undefined,
    count: number,
    currentLimitEnd: number,
): PanelDataLimitState {
    if (!isRaw || !rows || rows.length !== count) {
        return {
            hasDataLimit: false,
            limitEnd: currentLimitEnd,
        };
    }

    const lastTimestamp = rows[rows.length - 1]?.[0];
    const previousTimestamp = rows[rows.length - 2]?.[0];
    const limitEnd = currentLimitEnd !== 0 && currentLimitEnd !== lastTimestamp
        ? lastTimestamp
        : (previousTimestamp ?? lastTimestamp);

    return {
        hasDataLimit: true,
        limitEnd: limitEnd,
    };
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
        TagNames: getSourceTagName(seriesConfig),
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: isRollup(
            rollupTableList,
            seriesConfig.table,
            getIntervalMs(interval.IntervalType, interval.IntervalValue),
            sourceColumns.value,
        ),
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
        RollupList: rollupTableList,
    };

    return (await tagAnalyzerDataApi.fetchCalculationData(request)) as ChartFetchResponse;
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
        TagNames: getSourceTagName(seriesConfig),
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: seriesConfig.useRollupTable,
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
        sampling: sampling,
    };

    return (await tagAnalyzerDataApi.fetchRawData(request)) as ChartFetchResponse;
}

export async function fetchPanelDatasets(
    seriesConfigSet: PanelSeriesDefinition[],
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
    useSampling: boolean,
    includeColor: boolean,
    isNavigator: boolean | undefined,
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
        isNavigator,
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
    let hasDataLimit = false;
    let limitEnd = 0;

    for (const { seriesConfig, fetchResult } of seriesFetchResults) {
        const rows = fetchResult?.data?.rows;
        const limitState = analyzePanelDataLimit(isRaw, rows, count, limitEnd);

        if (limitState.hasDataLimit) {
            hasDataLimit = true;
            limitEnd = limitState.limitEnd;
        }

        datasets.push(
            buildChartSeriesData(seriesConfig, mapRowsToChartData(rows), isRaw, includeColor),
        );
    }

    return {
        datasets: datasets,
        interval: interval,
        count: count,
        hasDataLimit: hasDataLimit,
        limitEnd: limitEnd,
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
    const sampling = resolveRawFetchSampling(useSampling, sampleCount);

    return Promise.all(
        seriesConfigSet.map(async (seriesConfig) => ({
            seriesConfig: seriesConfig,
            fetchResult: isRaw
                ? await fetchRawSeriesRows(seriesConfig, timeRange, interval, count, sampling)
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
