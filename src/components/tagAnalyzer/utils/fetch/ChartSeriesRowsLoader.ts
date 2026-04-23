import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';
import { getIntervalMs } from '../time/IntervalUtils';
import { isConcreteTimeRange } from '../time/TimeBoundaryParsing';
import type { PanelSeriesConfig } from '../series/seriesTypes';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    RawFetchSampling,
    RawFetchRequest,
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
    aSeriesConfig: PanelSeriesConfig,
    aTimeRange: TimeRangeMs,
    aInterval: IntervalOption,
    aCount: number,
    aRollupTableList: string[],
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(aTimeRange)) {
        return createEmptyFetchResponse();
    }

    const sColumns = aSeriesConfig.sourceColumns;
    const sRequest: CalculationFetchRequest = {
        Table: getQualifiedTableName(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        isRollup: isRollup(
            aRollupTableList,
            aSeriesConfig.table,
            getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue),
            sColumns.value,
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
 * @param aTimeRange The concrete time range to query.
 * @param aInterval The resolved interval option.
 * @param aCount The desired fetch count.
 * @param aSampling The explicit raw-fetch sampling mode.
 * @returns The raw series fetch response.
 */
export async function fetchRawSeriesRows(
    aSeriesConfig: PanelSeriesConfig,
    aTimeRange: TimeRangeMs,
    aInterval: IntervalOption,
    aCount: number,
    aSampling: RawFetchSampling,
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(aTimeRange)) {
        return createEmptyFetchResponse();
    }

    const sColumns = aSeriesConfig.sourceColumns;
    const sRequest: RawFetchRequest = {
        Table: getQualifiedTableName(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        isRollup: aSeriesConfig.useRollupTable,
        CalculationMode: aSeriesConfig.calculationMode.toLowerCase(),
        ...aInterval,
        columnMap: sColumns,
        Count: aCount,
        sampling: aSampling,
    };

    return (await tagAnalyzerDataApi.fetchRawData(sRequest)) as ChartFetchResponse;
}
