import request from '@/api/core';
import { Toast } from '@/design-system/components';
import { convertToNewRollupSyntax, getUserName, isCurUserEqualAdmin, isRollupExt } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getInterval } from '@/utils/DashboardQueryParser';
import { TagzCsvParser } from '@/utils/tqlCsvParser';
import type { CalculationFetchRequest, RawFetchRequest, SeriesFetchColumnMap } from './FetchTypes';
import type { TimeRange } from '../time/timeTypes';

type VirtualStatTagSet = {
    columnMap?: Pick<SeriesFetchColumnMap, 'time'> | undefined;
};

type ChartFetchApiResponse = Awaited<ReturnType<typeof request>>;

type CalculationTimeBucketContext = {
    outerTimeExpression: string;
    nonRollupIntervalSeconds: number;
};

/**
 * Normalizes requested fetch bounds into the nanosecond range expected by the backend.
 * Intent: Keep raw and calculated fetches aligned with the backend timestamp precision rules.
 *
 * @param aStartTime The requested start timestamp.
 * @param aEndTime The requested end timestamp.
 * @returns The normalized fetch time range.
 */
function resolveFetchTimeBounds(aStartTime: number, aEndTime: number): TimeRange {
    const sNanoSec = 1000000;
    let sNormalizedStartTime = aStartTime;
    let sNormalizedEndTime = aEndTime;
    const sHasDecimalStartTime = aStartTime.toString().includes('.');
    const sHasDecimalEndTime = aEndTime.toString().includes('.');
    const sHalfTimeRange = (aEndTime - aStartTime) / 2;

    if (sHasDecimalStartTime) {
        sNormalizedStartTime = aStartTime * sNanoSec;
    }
    if (sHasDecimalEndTime) {
        sNormalizedEndTime = aEndTime * sNanoSec;
    }
    if (aStartTime.toString().length === 13) {
        sNormalizedStartTime = aStartTime * sNanoSec - sHalfTimeRange;
    }
    if (aEndTime.toString().length === 13) {
        sNormalizedEndTime = aEndTime * sNanoSec + sHalfTimeRange;
    }

    return {
        startTime: sNormalizedStartTime,
        endTime: sNormalizedEndTime,
    };
}

/**
 * Wraps a SQL statement with the TQL CSV envelope used by the chart fetch endpoints.
 * Intent: Keep every chart fetch query using the same TQL CSV wrapper.
 *
 * @param aSqlQuery The SQL query body to wrap.
 * @returns The wrapped TQL CSV query string.
 */
function buildCsvTqlQuery(aSqlQuery: string): string {
    return `SQL("${aSqlQuery}")\nCSV()`;
}

/**
 * Parses the shared chart CSV response and preserves the original response metadata.
 * Intent: Normalize chart responses and surface backend errors through the shared toast path.
 *
 * @param aApiResponse The raw chart fetch response returned by the request client.
 * @returns The normalized chart response, or undefined when the request fails or is not CSV text.
 */
function parseChartCsvResponse(aApiResponse: ChartFetchApiResponse) {
    let sConvertData;
    if (aApiResponse.status >= 400) {
        if (typeof aApiResponse.data === 'object') {
            Toast.error(aApiResponse.data.reason);
        } else {
            Toast.error(aApiResponse.data);
        }
        return sConvertData;
    }

    if (typeof aApiResponse.data === 'string') {
        sConvertData = {
            ...aApiResponse,
            data: {
                column: ['TIME', 'VALUE'],
                rows: TagzCsvParser(aApiResponse.data),
            },
        };
    }

    return sConvertData;
}

/**
 * Resolves the table name used by calculated fetches for non-admin users.
 * Intent: Qualify unscoped tables with the current user schema before building calculation queries.
 *
 * @param aTableName The source table name from the fetch request.
 * @returns The table name to use in the calculation query.
 */
function getCalculationTableName(aTableName: string): string {
    const sCurrentUserName = getUserName();

    if (isCurUserEqualAdmin()) {
        return aTableName;
    }

    if (aTableName.split('.').length === 1) {
        return `${sCurrentUserName}.${aTableName}`;
    }

    return aTableName;
}

/**
 * Resolves the shared time-bucket expressions used across calculated query modes.
 * Intent: Keep outer timestamp bucketing rules consistent across every calculated query builder.
 *
 * @param aUseRollup Whether the request should use rollup-aware query rules.
 * @param aIntervalUnit The interval unit for bucketed calculations.
 * @param aIntervalSize The interval size for bucketed calculations.
 * @returns The time-bucket expressions used by calculated queries.
 */
function resolveCalculationTimeBucketContext(
    aUseRollup: boolean,
    aIntervalUnit: string,
    aIntervalSize: number,
): CalculationTimeBucketContext {
    if (aUseRollup && aIntervalUnit === 'day' && aIntervalSize > 1) {
        const sRollupWindow = aIntervalSize * 60 * 60 * 24 * 1000000000;

        return {
            outerTimeExpression: `to_char(mTime / ${sRollupWindow}  * ${sRollupWindow})`,
            nonRollupIntervalSeconds: 1,
        };
    }

    if (aUseRollup) {
        return {
            outerTimeExpression: 'mTime',
            nonRollupIntervalSeconds: 1,
        };
    }

    if (aIntervalUnit === 'min') {
        return {
            outerTimeExpression: 'mTime',
            nonRollupIntervalSeconds: 60,
        };
    }

    if (aIntervalUnit === 'hour') {
        return {
            outerTimeExpression: 'mTime',
            nonRollupIntervalSeconds: 3600,
        };
    }

    return {
        outerTimeExpression: 'mTime',
        nonRollupIntervalSeconds: 1,
    };
}

/**
 * Builds the time bucket used by aggregate modes that truncate timestamps directly.
 * Intent: Choose the correct timestamp bucket expression for sum, min, and max queries.
 *
 * @param aUseRollup Whether the request should use rollup-aware query rules.
 * @param aTimeColumnName The source time column name.
 * @param aIntervalUnit The interval unit for bucketed calculations.
 * @param aIntervalSize The interval size for bucketed calculations.
 * @returns The SQL time-bucket expression for aggregate calculations.
 */
function buildTruncatedCalculationTimeBucket(
    aUseRollup: boolean,
    aTimeColumnName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
): string {
    if (aUseRollup) {
        return convertToNewRollupSyntax(
            aTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeColumnName}, ${aIntervalSize})`;
}

/**
 * Builds the time bucket used by average and count calculations.
 * Intent: Reuse one bucket expression builder for scaled non-rollup average and count queries.
 *
 * @param aUseRollup Whether the request should use rollup-aware query rules.
 * @param aTimeColumnName The source time column name.
 * @param aIntervalUnit The interval unit for bucketed calculations.
 * @param aIntervalSize The interval size for bucketed calculations.
 * @param aBucketIntervalSeconds The bucket size in seconds for non-rollup calculations.
 * @returns The SQL time-bucket expression for average and count calculations.
 */
function buildScaledCalculationTimeBucket(
    aUseRollup: boolean,
    aTimeColumnName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
): string {
    if (aUseRollup) {
        return convertToNewRollupSyntax(
            aTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    const sBucketSize = `${aIntervalSize} * ${aBucketIntervalSeconds} * 1000000000`;
    return `${aTimeColumnName} / (${sBucketSize}) * (${sBucketSize})`;
}

/**
 * Builds the shared table and filter clause for calculated queries.
 * Intent: Keep the calculated query filters identical across every calculation mode.
 *
 * @param aSourceTableName The source table name.
 * @param aTagNameColumn The source tag-name column name.
 * @param aTagNameList The tag names to query.
 * @param aTimeColumnName The source time column name.
 * @param aStartTime The normalized start timestamp.
 * @param aEndTime The normalized end timestamp.
 * @returns The SQL clause containing the source table and filters.
 */
function buildCalculationFilterClause(
    aSourceTableName: string,
    aTagNameColumn: string,
    aTagNameList: string,
    aTimeColumnName: string,
    aStartTime: number,
    aEndTime: number,
): string {
    return `from ${aSourceTableName} where ${aTagNameColumn} in ('${aTagNameList}') and ${aTimeColumnName} between ${aStartTime} and ${aEndTime}`;
}

/**
 * Builds the aggregate query used by sum, min, and max calculations.
 * Intent: Centralize aggregate SQL generation for the shared sum, min, and max code path.
 *
 * @param aCalculationMode The calculation mode to apply.
 * @param aValueColumnName The source value column name.
 * @param aSourceFilterClause The source table and filter clause.
 * @param aTimeBucketExpression The SQL time-bucket expression for the subquery.
 * @param aOuterTimeExpression The SQL expression used by the outer time projection.
 * @param aRowCount The maximum row count to request.
 * @returns The SQL query for aggregate calculations.
 */
function buildAggregateCalculationQuery(
    aCalculationMode: string,
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, ${aCalculationMode}(${aValueColumnName}) as mValue ${aSourceFilterClause} group by mTime`;

    return `select to_timestamp(${aOuterTimeExpression}) / 1000000.0 as time, ${aCalculationMode}(mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${aRowCount * 1}`;
}

/**
 * Builds the aggregate query used by average calculations.
 * Intent: Keep average query generation separate because it needs summed values and counts.
 *
 * @param aValueColumnName The source value column name.
 * @param aSourceFilterClause The source table and filter clause.
 * @param aTimeBucketExpression The SQL time-bucket expression for the subquery.
 * @param aOuterTimeExpression The SQL expression used by the outer time projection.
 * @param aRowCount The maximum row count to request.
 * @returns The SQL query for average calculations.
 */
function buildAverageCalculationQuery(
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, sum(${aValueColumnName}) as SUMMVAL, count(${aValueColumnName}) as CNTMVAL ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

/**
 * Builds the aggregate query used by count calculations.
 * Intent: Keep count query generation separate because it rolls subquery counts into outer buckets.
 *
 * @param aValueColumnName The source value column name.
 * @param aSourceFilterClause The source table and filter clause.
 * @param aTimeBucketExpression The SQL time-bucket expression for the subquery.
 * @param aOuterTimeExpression The SQL expression used by the outer time projection.
 * @param aRowCount The maximum row count to request.
 * @returns The SQL query for count calculations.
 */
function buildCountCalculationQuery(
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, count(${aValueColumnName}) as mValue ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(MVALUE) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

/**
 * Builds the time bucket used by first and last calculations.
 * Intent: Apply extended rollup rules only when first and last queries actually require them.
 *
 * @param aUseRollup Whether the request should use rollup-aware query rules.
 * @param aRollupTableList The rollup metadata available to the query builder.
 * @param aTableName The source table name.
 * @param aIntervalUnit The interval unit for bucketed calculations.
 * @param aIntervalSize The interval size for bucketed calculations.
 * @param aTimeColumnName The source time column name.
 * @returns The SQL time-bucket expression for first and last calculations.
 */
function buildFirstLastCalculationTimeBucket(
    aUseRollup: boolean,
    aRollupTableList: string[],
    aTableName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aTimeColumnName: string,
): string {
    const sIsExtRollup = isRollupExt(
        aRollupTableList,
        aTableName,
        getInterval(aIntervalUnit, aIntervalSize),
    );

    if (aUseRollup && sIsExtRollup) {
        return convertToNewRollupSyntax(
            aTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeColumnName}, ${aIntervalSize})`;
}

/**
 * Builds the aggregate query used by first and last calculations.
 * Intent: Generate the specialized first and last SQL that preserves the requested source order.
 *
 * @param aCalculationMode The calculation mode to apply.
 * @param aValueColumnName The source value column name.
 * @param aSourceFilterClause The source table and filter clause.
 * @param aTimeBucketExpression The SQL time-bucket expression for the subquery.
 * @param aOuterTimeExpression The SQL expression used by the outer time projection.
 * @param aRowCount The maximum row count to request.
 * @returns The SQL query for first and last calculations.
 */
function buildFirstLastCalculationQuery(
    aCalculationMode: string,
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime,  ${aCalculationMode}(time, ${aValueColumnName}) as mValue ${aSourceFilterClause} Group by mtime order by mtime `;

    return `select to_timestamp(${aOuterTimeExpression}) / 1000000.0 as time, ${aCalculationMode}(mTime, mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${aRowCount * 1}`;
}

/**
 * Builds the calculated-series SQL query body.
 * Intent: Route every calculated fetch mode through the correct SQL builder from one decision point.
 *
 * @param aTableName The source table name.
 * @param aTagNameList The tag name filter to query.
 * @param aStartTime The requested start timestamp.
 * @param aEndTime The requested end timestamp.
 * @param aCalculationMode The calculation mode to apply.
 * @param aRowCount The maximum row count to request.
 * @param aIntervalUnit The interval unit for bucketed calculations.
 * @param aIntervalSize The interval size for bucketed calculations.
 * @param aUseRollup Whether the request should use rollup-aware query rules.
 * @param aColumnMap The column mapping for the source table.
 * @param aRollupTableList The rollup metadata available to the query builder.
 * @returns The SQL query body for the calculated fetch.
 */
function buildCalculationMainQuery(
    aTableName: string,
    aTagNameList: string,
    aStartTime: number,
    aEndTime: number,
    aCalculationMode: string,
    aRowCount: number,
    aIntervalUnit: string,
    aIntervalSize: number,
    aUseRollup: boolean,
    aColumnMap: SeriesFetchColumnMap,
    aRollupTableList: string[],
): string {
    const sTableName = getCalculationTableName(aTableName);
    const { startTime: sStartTime, endTime: sEndTime } = resolveFetchTimeBounds(
        aStartTime,
        aEndTime,
    );
    const sTagNameColumn = aColumnMap.name;
    const sTimeColumnName = aColumnMap.time;
    const sValueColumnName = aColumnMap.value;
    const sFilterClause = buildCalculationFilterClause(
        sTableName,
        sTagNameColumn,
        aTagNameList,
        sTimeColumnName,
        sStartTime,
        sEndTime,
    );
    const {
        outerTimeExpression: sOuterTimeExpression,
        nonRollupIntervalSeconds: sNonRollupIntervalSeconds,
    } = resolveCalculationTimeBucketContext(aUseRollup, aIntervalUnit, aIntervalSize);

    if (
        aCalculationMode === 'sum' ||
        aCalculationMode === 'min' ||
        aCalculationMode === 'max'
    ) {
        const sTimeBucket = buildTruncatedCalculationTimeBucket(
            aUseRollup,
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );

        return buildAggregateCalculationQuery(
            aCalculationMode,
            sValueColumnName,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'avg') {
        const sTimeBucket = buildScaledCalculationTimeBucket(
            aUseRollup,
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
        );

        return buildAverageCalculationQuery(
            sValueColumnName,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'cnt') {
        const sTimeBucket = buildScaledCalculationTimeBucket(
            aUseRollup,
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
        );

        return buildCountCalculationQuery(
            sValueColumnName,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'first' || aCalculationMode === 'last') {
        const sTimeBucket = buildFirstLastCalculationTimeBucket(
            aUseRollup,
            aRollupTableList,
            sTableName,
            aIntervalUnit,
            aIntervalSize,
            sTimeColumnName,
        );

        return buildFirstLastCalculationQuery(
            aCalculationMode,
            sValueColumnName,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    return '';
}

/**
 * Builds the raw-series SQL query body.
 * Intent: Centralize raw query construction so ordering, limits, and sampling stay consistent.
 *
 * @param aTableName The source table name.
 * @param aTagName The tag name to query.
 * @param aStartTime The requested start timestamp.
 * @param aEndTime The requested end timestamp.
 * @param aSortDirection The optional sort direction flag.
 * @param aRowCount The maximum row count to request.
 * @param aColumnMap The column mapping for the source table.
 * @param aSamplingValue The sampling value to send with the query hint.
 * @param aUseSampling Whether the raw query should include sampling.
 * @returns The SQL query body for the raw fetch.
 */
function buildRawQuery(
    aTableName: string,
    aTagName: string,
    aStartTime: number,
    aEndTime: number,
    aSortDirection: number | undefined,
    aRowCount: number,
    aColumnMap: SeriesFetchColumnMap,
    aSamplingValue: number | string | undefined,
    aUseSampling: boolean | undefined,
): string {
    let sOrderBy = '';
    const { startTime: sStartTime, endTime: sEndTime } = resolveFetchTimeBounds(
        aStartTime,
        aEndTime,
    );

    if (aSortDirection == 1) {
        sOrderBy = '1 desc';
    } else if (aSortDirection == 2) {
        sOrderBy = '1';
    }

    const sNameCol = aColumnMap.name;
    const sTimeCol = aColumnMap.time;
    const sValueCol = aColumnMap.value;
    const sTimeQ = `to_timestamp(${sTimeCol}) / 1000000.0 as date`;
    const sValueQ = `${sValueCol} as value`;

    let sQuery = `SELECT${
        aUseSampling ? '/*+ SAMPLING(' + aSamplingValue + ') */' : ''
    } ${sTimeQ}, ${sValueQ} FROM ${aTableName} WHERE ${sNameCol} = '${aTagName}' AND ${sTimeCol} BETWEEN ${sStartTime} AND ${sEndTime}`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }

    if (aSamplingValue) {
        sQuery = 'select * from (' + sQuery + ') LIMIT ' + 200000;
    } else if (aRowCount > 0) {
        sQuery = sQuery + ' LIMIT ' + aRowCount;
    }

    return sQuery;
}

/**
 * Fetches the source column metadata for a table.
 * Intent: Query the system catalog so tag search can resolve the name, time, and value columns.
 *
 * @param aTableName The table name to inspect.
 * @returns The repository response containing the table column metadata rows.
 */
export async function fetchTableName(aTableName: string) {
    let DBName = '';
    let sTableName = aTableName;
    let sUserName = ADMIN_ID.toUpperCase();
    const sTableInfos = aTableName.split('.');
    if (aTableName.indexOf('.') === -1 || sTableInfos.length < 3) {
        DBName = String(-1);
        if (sTableInfos.length === 2) {
            sUserName = sTableInfos[0];
            sTableName = sTableInfos[sTableInfos.length - 1];
        }
    } else {
        DBName = `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = '${sTableInfos[0]}')`;
        sTableName = sTableInfos[sTableInfos.length - 1];
        sUserName = sTableInfos[1];
    }
    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER('${sUserName}') AND MC.DATABASE_ID = ${DBName} AND MT.NAME = '${sTableName}' AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const queryString = `/api/query?q=${sSql}`;

    const sData = await request({
        method: 'GET',
        url: encodeURI(queryString),
    });

    return sData;
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
    const sData = await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    });

    return parseChartCsvResponse(sData);
}

/**
 * Fetches raw chart data for a series request.
 * Intent: Build the raw SQL, wrap it in TQL CSV syntax, and normalize the chart response.
 *
 * @param aRawRequest The raw fetch request payload.
 * @returns The normalized chart fetch response for the raw query.
 */
export const fetchRawData = async (aRawRequest: RawFetchRequest) => {
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

    const sData = await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    });

    return parseChartCsvResponse(sData);
};

/**
 * Fetches the time bounds for virtual stat tags.
 * Intent: Use virtual stat metadata when possible and fall back to direct table bounds for mounted tables.
 *
 * @param aTableName The source table to inspect.
 * @param aTagNameList The tag names whose bounds should be resolved.
 * @param aTagSet The optional column mapping used to override the time column.
 * @returns The rows containing the resolved minimum and maximum times.
 */
export async function fetchVirtualStatTable(
    aTableName: string,
    aTagNameList: string[],
    aTagSet?: VirtualStatTagSet,
) {
    const sTime = aTagSet?.columnMap?.time ?? 'TIME';
    const sSplitTable = aTableName.split('.');
    let sQuery: string = `select min_time, max_time from ${sSplitTable.length === 1 ? ADMIN_ID : sSplitTable[0]}.V$${sSplitTable.at(-1)}_STAT WHERE NAME IN ('${aTagNameList.join("','")}')`;

    if (aTableName.split('.').length > 2) {
        sQuery = `select min(${sTime}), max(${sTime}) from ${aTableName}`;
    }

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(sQuery),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData.data.rows;
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
        url: `/api/tables`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }

    return sData;
}

/**
 * Fetches and groups rollup metadata by user, table, and column.
 * Intent: Normalize rollup rows into the nested structure used by rollup-aware fetch logic.
 *
 * @returns The grouped rollup metadata, or an empty array when no rollup rows are available.
 */
export async function getRollupTableList() {
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

    if (sRollupVersion === 'OLD')
        sUrl = `select u.name as user_name, root_table, interval_time, column_name, ext_type 
from v$rollup as v, m$sys_users as u 
where v.user_id = u.user_id 
group by root_table, interval_time, user_name, column_name, ext_type 
order by user_name, root_table asc, interval_time desc`;

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${sUrl}`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    const sConvertArray: any = {};
    if (sData?.data && sData.data.rows && sData.data.rows.length > 0) {
        for (const [user, table, value, column, ext_type] of sData.data.rows) {
            if (!sConvertArray[user]) {
                sConvertArray[user] = {};
            }
            if (!sConvertArray[user][table]) {
                sConvertArray[user][table] = [];
            }
            if (!sConvertArray[user][table][column]) {
                sConvertArray[user][table][column] = [];
            }
            if (!sConvertArray[user][table]['EXT_TYPE']) {
                sConvertArray[user][table]['EXT_TYPE'] = [];
            }
            sConvertArray[user][table]['EXT_TYPE'].push(ext_type);
            sConvertArray[user][table][column].push(value);
        }
        return sConvertArray;
    } else {
        return [];
    }
}

/**
 * Fetches one page of tag metadata rows from a table meta source.
 * Intent: Centralize paging query construction for the tag selection UI.
 *
 * @param aTableName The source table whose meta table should be queried.
 * @param aTagFilter The optional tag-name filter.
 * @param aPageNumber The 1-based page index to request.
 * @param aColumnName The column name to filter and sort by.
 * @returns The repository response containing one page of tag rows.
 */
export async function getTagPagination(
    aTableName: string,
    aTagFilter: string,
    aPageNumber: number,
    aColumnName: string,
) {
    const DEFAULT_LIMIT = 10;
    const sFilter = aTagFilter ? `${aColumnName} like '%${aTagFilter}%'` : '';
    const sLimit = `${(aPageNumber - 1) * DEFAULT_LIMIT}, ${DEFAULT_LIMIT}`;
    const sTableName = getMetaTableName(aTableName);
    const sData = await request({
        method: 'GET',
        url:
            `/api/query?q=` +
            encodeURIComponent(
                `select * from ${sTableName}${
                    sFilter !== ''
                        ? ' where ' + sFilter + ` ORDER BY ${aColumnName} `
                        : ` ORDER BY ${aColumnName} `
                } LIMIT ${sLimit}`,
            ),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
}

/**
 * Builds the meta-table name for a source table.
 * Intent: Keep meta-table naming logic in one place for pagination and total queries.
 *
 * @param aSourceTableName The source table name.
 * @returns The derived meta-table name.
 */
function getMetaTableName(aSourceTableName: string) {
    const sSplitName = aSourceTableName.split('.');
    const sTableName = '_' + sSplitName?.at(-1) + '_META';
    sSplitName.pop();
    sSplitName.push(sTableName);
    return sSplitName.join('.');
}

/**
 * Fetches the total number of tag rows matching a filter.
 * Intent: Let the tag selection UI compute pagination totals with the same meta-table rules as page fetches.
 *
 * @param aTableName The source table whose meta table should be queried.
 * @param aTagFilter The optional tag-name filter.
 * @param aColumnName The column name to filter by.
 * @returns The repository response containing the matching tag total.
 */
export async function getTagTotal(
    aTableName: string,
    aTagFilter: string,
    aColumnName: string,
) {
    const sTableName = getMetaTableName(aTableName);
    const sFilter = aTagFilter ? `${aColumnName} like '%${aTagFilter}%'` : '';
    const sData = await request({
        method: 'GET',
        url:
            `/api/query?q=` +
            encodeURIComponent(
                `select count(*) from ${sTableName}${sFilter !== '' ? ' where ' + sFilter : ''}`,
            ),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
}
