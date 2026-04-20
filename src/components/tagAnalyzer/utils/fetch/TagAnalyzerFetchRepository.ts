import { isRollup, parseTables } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';
import { toLegacyTimeRangeInput } from '../legacy/LegacyTimeAdapter';
import { getQualifiedTableName } from './FetchHelpers';
import {
    fetchCalculationData,
    fetchRawData,
    fetchTablesData,
} from './ApiRepository';
import { resolveTimeBoundaryRanges } from '../time/PanelTimeRangeResolver';
import { getIntervalMs } from '../time/IntervalUtils';
import type { OptionalTimeRange, TimeRange } from '../time/timeTypes';
import type { SeriesConfig } from '../series/seriesTypes';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    RawFetchRequest,
    SeriesFetchColumnMap,
} from './FetchTypes';
import type { IntervalOption, ResolvedTimeBounds, ValueRangePair } from '../time/timeTypes';

/**
 * Fetches and parses the available table list.
 * Intent: Hide the repository response shape behind a simple parsed-table helper.
 *
 * @returns The parsed table names, or undefined when the repository call fails.
 */
export async function fetchParsedTables(): Promise<string[] | undefined> {
    const sResult = (await fetchTablesData()) as {
        success?: boolean;
        status?: number;
        data: unknown;
    };
    if (sResult.success === false) {
        return undefined;
    }
    if (typeof sResult.status === 'number' && sResult.status >= 400) {
        return undefined;
    }

    return parseTables(sResult.data as { columns: unknown[]; rows: unknown[] });
}

/**
 * Fetches the top-level time boundary ranges for a series set.
 * Intent: Resolve the board-wide time window before downstream chart fetches run.
 *
 * @param aTagSet The series config set to inspect.
 * @param aBoardTime The board time bounds used as input to the boundary lookup.
 * @returns The resolved boundary range, or undefined when it cannot be calculated.
 */
export async function fetchTopLevelTimeBoundaryRanges(
    aTagSet: SeriesConfig[],
    aBoardTime: ResolvedTimeBounds,
): Promise<ValueRangePair | undefined> {
    return resolveTimeBoundaryRanges(
        aTagSet,
        toLegacyTimeRangeInput(aBoardTime),
        { bgn: '', end: '' },
    );
}

/**
 * Fetches rows for a single series.
 * Intent: Route raw and calculated series requests through the correct repository call.
 *
 * @param aSeriesConfig The series config to fetch.
 * @param aTimeRange The concrete time range to query.
 * @param aInterval The resolved interval option.
 * @param aCount The desired fetch count.
 * @param aIsRaw Whether the request should use the raw data path.
 * @param aRollupTableList The rollup tables available to the fetch.
 * @param aUseSampling Whether sampling should be enabled for the raw path.
 * @param aSamplingValue The sampling value for the raw path.
 * @returns The repository fetch response for the series.
 */
export async function fetchSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRange,
    aInterval: IntervalOption,
    aCount: number,
    aIsRaw: boolean,
    aRollupTableList: string[],
    aUseSampling: boolean | undefined,
    aSamplingValue: number | undefined,
): Promise<ChartFetchResponse> {
    if (!isConcreteFetchRange(aTimeRange)) {
        return createEmptyFetchResponse();
    }

    if (aIsRaw) {
        return fetchRawSeriesRows(
            aSeriesConfig,
            aTimeRange,
            aInterval,
            aCount,
            aUseSampling || undefined,
            aUseSampling ? aSamplingValue : undefined,
        );
    }

    return fetchCalculatedSeriesRows(
        aSeriesConfig,
        aTimeRange,
        aInterval,
        aCount,
        aRollupTableList,
    );
}

/**
 * Checks whether a time range is concrete enough for repository fetches.
 * Intent: Guard the repository against incomplete or inverted range inputs.
 *
 * @param aTimeRange The time range candidate to validate.
 * @returns True when the range is concrete and ordered.
 */
function isConcreteFetchRange(aTimeRange: OptionalTimeRange): aTimeRange is TimeRange {
    if (!aTimeRange) {
        return false;
    }

    const { startTime, endTime } = aTimeRange;
    return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime > 0 &&
        endTime > 0 &&
        endTime > startTime
    );
}

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
 * @param aTimeRange The concrete time range to query.
 * @param aInterval The resolved interval option.
 * @param aCount The desired fetch count.
 * @param aRollupTableList The rollup tables available to the fetch.
 * @returns The calculated series fetch response.
 */
async function fetchCalculatedSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRange,
    aInterval: IntervalOption,
    aCount: number,
    aRollupTableList: string[],
): Promise<ChartFetchResponse> {
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

    return (await fetchCalculationData(sRequest)) as ChartFetchResponse;
}

/**
 * Fetches raw series rows from the raw repository.
 * Intent: Build the raw fetch request in one place before calling the repository API.
 *
 * @param aSeriesConfig The series config to fetch.
 * @param aTimeRange The concrete time range to query.
 * @param aInterval The resolved interval option.
 * @param aCount The desired fetch count.
 * @param aUseSampling Whether sampling should be enabled.
 * @param aSamplingValue The sampling value to send with the request.
 * @returns The raw series fetch response.
 */
async function fetchRawSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRange,
    aInterval: IntervalOption,
    aCount: number,
    aUseSampling: boolean | undefined,
    aSamplingValue: number | string | undefined,
): Promise<ChartFetchResponse> {
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

    return (await fetchRawData(sRequest)) as ChartFetchResponse;
}
