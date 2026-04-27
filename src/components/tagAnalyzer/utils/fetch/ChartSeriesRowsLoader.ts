import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';
import { getIntervalMs } from '../time/IntervalUtils';
import { isConcreteTimeRange } from '../time/TimeBoundaryParsing';
import type { PanelSeriesConfig } from '../series/PanelSeriesTypes';
import { EMPTY_CHART_FETCH_RESPONSE } from './FetchConstants';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    RawFetchSampling,
    RawFetchRequest,
} from './FetchTypes';
import { addAdminSchemaIfNeeded } from './AdminSchemaTableName';
import { tagAnalyzerDataApi } from './TagAnalyzerDataRepository';
import type { IntervalOption, TimeRangeMs } from '../time/types/TimeTypes';

/**
 * Fetches calculated series rows from the calculation repository.
 * Intent: Build the calculation request in one place before calling the repository API.
 *
 * @param seriesConfig The series config to fetch.
 * @param timeRange The time range to validate and query.
 * @param interval The resolved interval option.
 * @param count The desired fetch count.
 * @param rollupTableList The rollup tables available to the fetch.
 * @returns The calculated series fetch response.
 */
export async function fetchCalculatedSeriesRows(
    seriesConfig: PanelSeriesConfig,
    timeRange: TimeRangeMs,
    interval: IntervalOption,
    count: number,
    rollupTableList: string[],
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(timeRange)) {
        return EMPTY_CHART_FETCH_RESPONSE;
    }

    const sColumns = seriesConfig.sourceColumns;
    const sRequest: CalculationFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(seriesConfig),
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: isRollup(
            rollupTableList,
            seriesConfig.table,
            getIntervalMs(interval.IntervalType, interval.IntervalValue),
            sColumns.value,
        ),
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sColumns,
        Count: count,
        RollupList: rollupTableList,
    };

    return (await tagAnalyzerDataApi.fetchCalculationData(sRequest)) as ChartFetchResponse;
}

/**
 * Fetches raw series rows from the raw repository.
 * Intent: Build the raw fetch request in one place before calling the repository API.
 *
 * @param seriesConfig The series config to fetch.
 * @param timeRange The concrete time range to query.
 * @param interval The resolved interval option.
 * @param count The desired fetch count.
 * @param sampling The explicit raw-fetch sampling mode.
 * @returns The raw series fetch response.
 */
export async function fetchRawSeriesRows(
    seriesConfig: PanelSeriesConfig,
    timeRange: TimeRangeMs,
    interval: IntervalOption,
    count: number,
    sampling: RawFetchSampling,
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(timeRange)) {
        return EMPTY_CHART_FETCH_RESPONSE;
    }

    const sColumns = seriesConfig.sourceColumns;
    const sRequest: RawFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(seriesConfig),
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: seriesConfig.useRollupTable,
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sColumns,
        Count: count,
        sampling: sampling,
    };

    return (await tagAnalyzerDataApi.fetchRawData(sRequest)) as ChartFetchResponse;
}
