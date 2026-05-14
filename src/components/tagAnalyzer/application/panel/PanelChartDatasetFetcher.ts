import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type {
    PanelAxes,
    PanelData,
    PanelSampling,
    PanelTime,
} from '../../domain/PanelModel';
import { calculateInterval } from '../../domain/ChartIntervalUtils';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import {
    getIntervalMs,
    normalizeStoredTimeUnit,
} from '../../domain/time/TimeUnitUtils';
import {
    resolvePanelOrBoardTimeRange,
} from '../../domain/time/TimeRangeResolution';
import { isConcreteTimeRange } from '../../domain/time/TimeRangeUtils';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../../domain/time/TimeTypes';
import { addAdminSchemaIfNeeded } from '../../fetch/helper/TableNameSchema';
import { chartSeriesDataApi } from '../../fetch/ChartSeriesDataFetcher';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    FetchPanelSeriesRowsResult,
    PanelSeriesFetchResult,
    RawFetchRequest,
    RawFetchSampling,
} from '../../fetch/FetchContracts';
import { SortOrderEnum } from '../../fetch/FetchContracts';

const EMPTY_CHART_FETCH_RESPONSE: ChartFetchResponse = {
    data: {
        column: [],
        rows: [],
    },
};

const EMPTY_FETCH_PANEL_SERIES_ROWS_RESULT: FetchPanelSeriesRowsResult = {
    seriesFetchResults: [],
    interval: {
        IntervalType: '',
        IntervalValue: 0,
    },
    count: 0,
    isRaw: false,
};
export type PanelDatasetFetchPurpose = 'main' | 'navigator';

export function calculateSampleCount(
    limit: number,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    chartWidth: number,
): number {
    if (limit > 0) {
        return limit;
    }

    const sPixelsPerTick = isRaw ? pixelsPerTickRaw : pixelsPerTick;

    return calculatePixelLimitedCount(chartWidth, sPixelsPerTick);
}

function calculatePixelLimitedCount(chartWidth: number, pixelsPerTick: number): number {
    return Math.ceil(chartWidth / (pixelsPerTick > 0 ? pixelsPerTick : 1));
}

function resolvePanelFetchCount({
    panelData,
    isRaw,
    panelAxes,
    chartWidth,
}: {
    panelData: PanelData;
    isRaw: boolean;
    panelAxes: PanelAxes;
    chartWidth: number;
}): number {
    return calculateSampleCount(
        panelData.count,
        isRaw,
        panelAxes.x_axis.calculated_data_pixels_per_tick,
        panelAxes.x_axis.raw_data_pixels_per_tick,
        chartWidth,
    );
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

function resolveEffectiveRawMode(
    isRaw: boolean,
    useSampling: boolean,
    fetchPurpose: PanelDatasetFetchPurpose,
): boolean {
    if (!isRaw) {
        return false;
    }

    return fetchPurpose === 'main' || useSampling;
}

function resolvePurposeSampling(
    panelAxes: PanelAxes,
    fetchPurpose: PanelDatasetFetchPurpose,
    navigationSamplingEnabled: boolean,
): PanelSampling {
    const sPurposeSampling = fetchPurpose === 'main'
        ? panelAxes.main_chart_sampling
        : panelAxes.sampling;
    const sResolvedSampling = sPurposeSampling ?? {
        enabled: false,
        sample_count: panelAxes.sampling?.sample_count ?? 0,
    };

    return fetchPurpose === 'navigator'
        ? {
              ...sResolvedSampling,
              enabled: navigationSamplingEnabled,
          }
        : sResolvedSampling;
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

export async function fetchPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: TimeRangeConfig | undefined,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
    navigationSamplingEnabled: boolean,
    fetchPurpose: PanelDatasetFetchPurpose = 'main',
): Promise<FetchPanelSeriesRowsResult> {
    const sPurposeSampling = resolvePurposeSampling(
        panelAxes,
        fetchPurpose,
        navigationSamplingEnabled,
    );
    const sEffectiveRawMode = resolveEffectiveRawMode(
        isRaw,
        sPurposeSampling.enabled,
        fetchPurpose,
    );
    const sUseRawSampling =
        isRaw && sEffectiveRawMode && sPurposeSampling.enabled;
    const count = resolvePanelFetchCount({
        panelData: panelData,
        isRaw: sEffectiveRawMode,
        panelAxes: panelAxes,
        chartWidth: chartWidth,
    });
    const timeRangeToFetch = resolvePanelFetchTimeRange(
        panelTime,
        boardTime,
        timeRange,
    );
    if (!isFetchableTimeRange(timeRangeToFetch)) {
        return EMPTY_FETCH_PANEL_SERIES_ROWS_RESULT;
    }

    const interval = resolvePanelFetchInterval(
        panelData,
        panelAxes,
        timeRangeToFetch,
        chartWidth,
        sEffectiveRawMode,
    );
    const seriesFetchResults = await fetchPanelSeriesResults(
        seriesConfigSet,
        timeRangeToFetch,
        interval,
        count,
        sEffectiveRawMode,
        sUseRawSampling,
        sPurposeSampling.sample_count,
        rollupTableList,
    );

    return {
        seriesFetchResults: seriesFetchResults,
        interval: interval,
        count: count,
        isRaw: sEffectiveRawMode,
    };
}

async function fetchPanelSeriesResults(
    seriesConfigSet: PanelSeriesDefinition[],
    timeRange: TimeRangeMs,
    interval: FetchPanelSeriesRowsResult['interval'],
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

