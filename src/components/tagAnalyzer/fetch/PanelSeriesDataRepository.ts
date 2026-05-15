import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import { getIntervalMs } from '../domain/time/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { addAdminSchemaIfNeeded } from './helper/TableNameSchema';
import { chartSeriesDataApi } from './ChartSeriesDataFetcher';
import type {
    PanelSeriesFetchResult,
    CalculationFetchRequest,
    ChartFetchResponse,
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

export async function fetchPanelSeriesRows({
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

    return (await chartSeriesDataApi.fetchCalculationData(request)) as ChartFetchResponse;
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

    return (await chartSeriesDataApi.fetchRawData(request)) as ChartFetchResponse;
}
