import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';
import { getIntervalMs } from '../time/IntervalUtils';
import { isConcreteTimeRange } from '../time/TimeBoundaryParsing';
import type { SeriesConfig } from '../series/seriesTypes';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    RawFetchRequest,
    SeriesFetchColumnMap,
} from './FetchContracts';
import { getQualifiedTableName } from './FetchTableNameResolver';
import { tagAnalyzerDataApi } from './TagAnalyzerDataRepository';
import type { IntervalOption, TimeRangeMs } from '../time/timeTypes';

/**
 * Creates an empty chart fetch response.
 * Intent: Give invalid fetch paths a predictable response shape.
 *
 * @returns The empty chart fetch response.
 */
function createEmptyFetchResponse(): ChartFetchResponse {
    return {
        data: {
            column: [],
            rows: [],
        },
    };
}

/**
 * Checks whether a series config includes the required fetch column map.
 * Intent: Prevent repository requests from running when the source column metadata is incomplete.
 *
 * @param aSeriesConfig The series config to validate.
 * @returns True when the series config contains name, time, and value fetch columns.
 */
function hasSeriesFetchColumns(
    aSeriesConfig: SeriesConfig,
): aSeriesConfig is SeriesConfig & { colName: SeriesFetchColumnMap } {
    return (
        typeof aSeriesConfig.colName?.name === 'string' &&
        typeof aSeriesConfig.colName.time === 'string' &&
        typeof aSeriesConfig.colName.value === 'string'
    );
}

/**
 * Fetches calculated series rows from the calculation repository.
 * Intent: Build the calculation request in one place before calling the repository API.
 *
 * @param aSeriesConfig The series config to fetch.
 * @param aTimeRange The time range to validate and query.
 * @param aInterval The resolved interval option.
 * @param aCount The desired fetch count.
 * @param aRollupTableList The rollup tables available to the fetch.
 * @returns The calculated series fetch response.
 */
export async function fetchCalculatedSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRangeMs | undefined,
    aInterval: IntervalOption,
    aCount: number,
    aRollupTableList: string[],
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(aTimeRange)) {
        return createEmptyFetchResponse();
    }

    if (!hasSeriesFetchColumns(aSeriesConfig)) {
        return createEmptyFetchResponse();
    }

    const sColumns = aSeriesConfig.colName;
    const sRequest: CalculationFetchRequest = {
        Table: getQualifiedTableName(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        isRollup: isRollup(
            aRollupTableList,
            aSeriesConfig.table,
            getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue),
            sColumns.value ?? '',
        ),
        CalculationMode: aSeriesConfig.calculationMode.toLowerCase(),
        ...aInterval,
        columnMap: sColumns,
        Count: aCount,
        RollupList: aRollupTableList,
    };

    return (await tagAnalyzerDataApi.fetchCalculationData(sRequest)) as ChartFetchResponse;
}

/**
 * Fetches raw series rows from the raw repository.
 * Intent: Build the raw fetch request in one place before calling the repository API.
 *
 * @param aSeriesConfig The series config to fetch.
 * @param aTimeRange The time range to validate and query.
 * @param aInterval The resolved interval option.
 * @param aCount The desired fetch count.
 * @param aUseSampling Whether sampling should be enabled.
 * @param aSamplingValue The sampling value to send with the request.
 * @returns The raw series fetch response.
 */
export async function fetchRawSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRangeMs | undefined,
    aInterval: IntervalOption,
    aCount: number,
    aUseSampling: boolean | undefined,
    aSamplingValue: number | string | undefined,
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(aTimeRange)) {
        return createEmptyFetchResponse();
    }

    if (!hasSeriesFetchColumns(aSeriesConfig)) {
        return createEmptyFetchResponse();
    }

    const sColumns = aSeriesConfig.colName;
    const sRequest: RawFetchRequest = {
        Table: getQualifiedTableName(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        isRollup: aSeriesConfig.onRollup,
        CalculationMode: aSeriesConfig.calculationMode.toLowerCase(),
        ...aInterval,
        columnMap: sColumns,
        Count: aCount,
        useSampling: aUseSampling,
        sampleValue: aSamplingValue,
    };

    return (await tagAnalyzerDataApi.fetchRawData(sRequest)) as ChartFetchResponse;
}
