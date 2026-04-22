import request from '@/api/core';
import { parseTables } from '@/utils';
import { TagzCsvParser } from '@/utils/tqlCsvParser';
import { toLegacyTimeRangeInput } from '../legacy/LegacyTimeAdapter';
import {
    buildCalculationMainQuery,
} from './CalculationFetchQueryBuilder';
import {
    type RequestClientResponse,
    showRequestError,
} from './FetchRequestErrorPresenter';
import {
    buildCsvTqlQuery,
    buildRawQuery,
} from './RawFetchQueryBuilder';
import { resolveTimeBoundaryRanges } from '../time/TimeBoundaryRangeResolver';
import type { SeriesConfig } from '../series/seriesTypes';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    RawFetchRequest,
} from './FetchContracts';
import type { ResolvedTimeBounds, ValueRangePair } from '../time/timeTypes';

type ChartFetchApiResponse = {
    status: number;
    data: string;
    statusText?: string;
};

type RollupTableMap = Record<string, Record<string, Record<string, string[]>>>;

/**
 * Parses the shared chart CSV response and preserves the original response metadata.
 * Intent: Normalize chart responses and surface backend errors through the shared toast path.
 *
 * @param aApiResponse The raw chart fetch response returned by the request client.
 * @returns The normalized chart response, or undefined when the request fails or is not CSV text.
 */
function parseChartCsvResponse(
    aApiResponse: ChartFetchApiResponse,
): ChartFetchResponse | undefined {
    if (aApiResponse.status >= 400) {
        showRequestError(
            aApiResponse as unknown as RequestClientResponse<unknown>,
        );
        return undefined;
    }

    if (typeof aApiResponse.data !== 'string') {
        return undefined;
    }

    return {
        data: {
            column: ['TIME', 'VALUE'],
            rows: TagzCsvParser(aApiResponse.data),
        },
    };
}

/**
 * Fetches calculated chart data for a series request.
 * Intent: Build the calculated SQL, wrap it in TQL CSV syntax, and normalize the chart response.
 *
 * @param aCalculationRequest The calculated fetch request payload.
 * @returns The normalized chart fetch response for the calculated query.
 */
export async function fetchCalculationData(aCalculationRequest: CalculationFetchRequest) {
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
    } = aCalculationRequest;
    const sMainQuery = buildCalculationMainQuery(
        sTableName,
        sTagNameList,
        sStartTime,
        sEndTime,
        sCalculationMode,
        sRowCount,
        sIntervalUnit,
        sIntervalSize,
        sUseRollup,
        sColumnMap,
        sRollupTableList,
    );
    const sLastQuery = buildCsvTqlQuery(sMainQuery);
    const sData = (await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    })) as ChartFetchApiResponse;

    return parseChartCsvResponse(sData);
}

/**
 * Fetches raw chart data for a series request.
 * Intent: Build the raw SQL, wrap it in TQL CSV syntax, and normalize the chart response.
 *
 * @param aRawRequest The raw fetch request payload.
 * @returns The normalized chart fetch response for the raw query.
 */
export async function fetchRawData(aRawRequest: RawFetchRequest) {
    const {
        Table: sTableName,
        TagNames: sTagName,
        Start: sStartTime,
        End: sEndTime,
        Direction: sSortDirection,
        Count: sRowCount,
        columnMap: sColumnMap,
        sampleValue: sSamplingValue,
        useSampling: sUseSampling,
    } = aRawRequest;
    const sQuery = buildRawQuery(
        sTableName,
        sTagName,
        sStartTime,
        sEndTime,
        sSortDirection,
        sRowCount,
        sColumnMap,
        sSamplingValue,
        sUseSampling,
    );
    const sLastQuery = buildCsvTqlQuery(sQuery);
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
    const sResult = (await tagAnalyzerDataApi.fetchTablesData()) as {
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
    return resolveTimeBoundaryRanges(aTagSet, toLegacyTimeRangeInput(aBoardTime), {
        bgn: '',
        end: '',
    });
}
