import request from '@/api/core';
import { toLegacyTimeRangeInput } from '../legacy/LegacyTimeAdapter';
import {
    buildAggregateCalculationSql,
    buildAverageCalculationSql,
    buildCountCalculationSql,
    buildFirstLastCalculationSql,
} from './sqlBuilder/BuildCalculationSql';
import {
    showRequestError,
} from './FetchRequestErrorPresenter';
import {
    buildRawSeriesSql,
} from './sqlBuilder/BuildRawSeriesSql';
import { buildTqlCsvPayload } from './TqlCsvPayloadBuilder';
import { parseChartCsvResponse } from './parsing/ChartFetchResponseParser';
import { parseFetchTableListResponse } from './parsing/TableListParser';
import { resolveTimeBoundaryRanges } from '../time/TimeBoundaryRangeResolver';
import type { PanelSeriesConfig } from '../series/PanelSeriesTypes';
import { addCurrentUserSchemaIfNeeded } from './CurrentUserSchemaTableName';
import {
    SortOrderEnum,
} from './FetchTypes';
import { convertTimeRangeMsToNanoseconds } from '../time/UnixTimeConverters';
import type {
    CalculationFetchRequest,
    ChartFetchApiResponse,
    RawFetchRequest,
    RollupTableMap,
    SeriesFetchColumnMap,
    TableListFetchResponse,
    TopLevelTimeBoundaryResponse,
} from './FetchTypes';
import type { ResolvedTimeBounds, TimeRangeNs } from '../time/types/TimeTypes';

/**
 * Fetches calculated chart data for a series request.
 * Intent: Build the calculated SQL, wrap it in TQL CSV syntax, and normalize the chart response.
 *
 * @param calculationRequest The calculated fetch request payload.
 * @returns The normalized chart fetch response for the calculated query.
 */
export async function fetchCalculationData(calculationRequest: CalculationFetchRequest) {
    const {
        Table: sTableName,
        TagNames: sTagNameList,
        Start: sStartTime,
        End: sEndTime,
        CalculationMode: sCalculationMode,
        Count: sRowCount,
        IntervalType: sIntervalUnit,
        IntervalValue: sIntervalSize,
        isRollup: sUseRollup,
        columnMap: sColumnMap,
        RollupList: sRollupTableList,
    } = calculationRequest;
    const sQualifiedTableName = addCurrentUserSchemaIfNeeded(sTableName);
    const sFetchTimeRange = convertTimeRangeMsToNanoseconds({
        startTime: sStartTime,
        endTime: sEndTime,
    });
    const sMainSql = buildRequestedCalculationSql(
        sQualifiedTableName,
        sTagNameList,
        sFetchTimeRange,
        sCalculationMode,
        sRowCount,
        sIntervalUnit,
        sIntervalSize,
        sUseRollup,
        sColumnMap,
        sRollupTableList,
    );
    const sLastQuery = buildTqlCsvPayload(sMainSql);
    const sData = (await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    })) as ChartFetchApiResponse;

    return parseChartCsvResponse(sData);
}

/**
 * Chooses the calculation SQL family for a fetch request.
 * Intent: Keep calculation-mode dispatch in the fetch layer instead of inside sqlBuilder.
 */
function buildRequestedCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupTableList: string[],
): string {
    switch (calculationMode) {
        case 'sum':
        case 'min':
        case 'max':
            return buildAggregateCalculationSql(
                sourceTableName,
                tagNameList,
                fetchTimeRange,
                calculationMode,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
            );
        case 'avg':
            return buildAverageCalculationSql(
                sourceTableName,
                tagNameList,
                fetchTimeRange,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
            );
        case 'cnt':
            return buildCountCalculationSql(
                sourceTableName,
                tagNameList,
                fetchTimeRange,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
            );
        case 'first':
        case 'last':
            return buildFirstLastCalculationSql(
                sourceTableName,
                tagNameList,
                fetchTimeRange,
                calculationMode,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
                rollupTableList,
            );
        default:
            return '';
    }
}

/**
 * Fetches raw chart data for a series request.
 * Intent: Build the raw SQL, wrap it in TQL CSV syntax, and normalize the chart response.
 *
 * @param rawRequest The raw fetch request payload.
 * @returns The normalized chart fetch response for the raw SQL.
 */
export async function fetchRawData(rawRequest: RawFetchRequest) {
    const {
        Table: sTableName,
        TagNames: sTagName,
        Start: sStartTime,
        End: sEndTime,
        SortOrder: sSortOrder = SortOrderEnum.Unsorted,
        Count: sRowCount,
        columnMap: sColumnMap,
        sampling: sSampling,
    } = rawRequest;
    const sFetchTimeRange = convertTimeRangeMsToNanoseconds({
        startTime: sStartTime,
        endTime: sEndTime,
    });
    const sSql = buildRawSeriesSql(
        sTableName,
        sTagName,
        sFetchTimeRange,
        sRowCount,
        sColumnMap,
        sSampling,
        sSortOrder,
    );
    const sLastQuery = buildTqlCsvPayload(sSql);
    const sData = (await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    })) as ChartFetchApiResponse;

    return parseChartCsvResponse(sData);
}

/**
 * Fetches the available table list from the backend.
 * Intent: Expose the raw table-list response for callers that parse the rows separately.
 *
 * @returns The repository response containing the available tables.
 */
export async function fetchTablesData() {
    const sData = await request({
        method: 'GET',
        url: '/api/tables',
    });
    showRequestError(sData);

    return sData;
}

/**
 * Fetches and groups rollup metadata by user, table, and column.
 * Intent: Normalize rollup rows into the nested structure used by rollup-aware fetch logic.
 *
 * @returns The grouped rollup metadata, or an empty array when no rollup rows are available.
 */
export async function getRollupTableList(): Promise<RollupTableMap | []> {
    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    let sUrl = `select t1.user_name as user_name, 
  case when t1.database_id = -1 then 'MACHBASEDB' else t2.MOUNTDB end || '.' || t1.root_table as root_table, 
  t1.interval_time as interval_time, t1.column_name as column_name, t1.ext_type as ext_type 
from (
  select v.database_id, u.name as user_name, root_table, interval_time, column_name, ext_type 
  from v$rollup as v, m$sys_users as u 
  where v.user_id = u.user_id 
  group by v.database_id, root_table, interval_time, user_name, column_name, ext_type 
) as t1 LEFT OUTER JOIN V$STORAGE_MOUNT_DATABASES as t2 ON (t1.database_id = t2.BACKUP_TBSID) 
order by user_name, root_table asc, interval_time desc`;

    if (sRollupVersion === 'OLD') {
        sUrl = `select u.name as user_name, root_table, interval_time, column_name, ext_type 
from v$rollup as v, m$sys_users as u 
where v.user_id = u.user_id 
group by root_table, interval_time, user_name, column_name, ext_type 
order by user_name, root_table asc, interval_time desc`;
    }

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${sUrl}`,
    });
    console.log('sData:', sData);

    console.log(String(sData));
    showRequestError(sData);

    const sRollupMap: RollupTableMap = {};
    if (!sData?.data || !('rows' in sData.data) || !Array.isArray(sData.data.rows)) {
        return [];
    }

    for (const [user, table, value, column, extType] of sData.data.rows as Array<
        [string, string, string, string, string]
    >) {
        sRollupMap[user] ??= {};
        sRollupMap[user][table] ??= {};
        sRollupMap[user][table][column] ??= [];
        sRollupMap[user][table].EXT_TYPE ??= [];
        sRollupMap[user][table].EXT_TYPE.push(extType);
        sRollupMap[user][table][column].push(value);
    }

    return Object.keys(sRollupMap).length === 0 ? [] : sRollupMap;
}

export const tagAnalyzerDataApi = {
    fetchCalculationData,
    fetchRawData,
    fetchTablesData,
    getRollupTableList,
};

/**
 * Fetches and parses the available table list.
 * Intent: Hide the repository response shape behind a simple parsed-table helper.
 *
 * @returns The parsed table names, or undefined when the repository call fails.
 */
export async function fetchParsedTables(): Promise<string[] | undefined> {
    const sResult = (await tagAnalyzerDataApi.fetchTablesData()) as TableListFetchResponse;
    return parseFetchTableListResponse(sResult);
}

/**
 * Fetches the top-level time boundary ranges for a series set.
 * Intent: Resolve the board-wide time window before downstream chart fetches run.
 *
 * @param tagSet The series config set to inspect.
 * @param boardTime The board time bounds used as input to the boundary lookup.
 * @returns The resolved boundary range, or null when it cannot be calculated.
 */
export async function fetchTopLevelTimeBoundaryRanges(
    tagSet: PanelSeriesConfig[],
    boardTime: ResolvedTimeBounds,
): Promise<TopLevelTimeBoundaryResponse> {
    const sTimeBoundaryRanges = await resolveTimeBoundaryRanges(
        tagSet,
        toLegacyTimeRangeInput(boardTime),
        {
            bgn: '',
            end: '',
        },
    );

    return sTimeBoundaryRanges ?? null;
}
