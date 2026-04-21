import { Toast } from '@/design-system/components';
import {
    convertToNewRollupSyntax,
    getUserName,
    isCurUserEqualAdmin,
    isRollupExt,
} from '@/utils';
import { getInterval } from '@/utils/DashboardQueryParser';
import type { SeriesFetchColumnMap } from './FetchContracts';
import type { TimeRange } from '../time/timeTypes';

type CalculationTimeBucketContext = {
    outerTimeExpression: string;
    nonRollupIntervalSeconds: number;
};

type PrimitiveErrorValue = string | number | boolean;

type RequestSuccessPayload<TData> = {
    data: TData;
    success: boolean;
    reason?: string;
    elapse?: string;
};

type HttpErrorResponse<TData = unknown> = {
    status: number;
    data: TData;
    statusText?: string;
};

type ErrorMessageContainer = {
    reason?: unknown;
    message?: unknown;
};

type RequestErrorData = PrimitiveErrorValue | ErrorMessageContainer | null;

export type RequestClientResponse<TData> =
    | RequestSuccessPayload<TData>
    | HttpErrorResponse<RequestErrorData>;

/**
 * Checks whether a value is an HTTP error response returned by the request client.
 * Intent: Distinguish failed Axios responses from successful backend payloads that do not include a status code.
 *
 * @param aValue The candidate response value.
 * @returns Whether the value matches the HTTP error response shape.
 */
function isHttpErrorResponse<TData>(
    aValue: RequestClientResponse<TData>,
): aValue is HttpErrorResponse<RequestErrorData> {
    if (typeof aValue !== 'object' || aValue === null) {
        return false;
    }

    return 'status' in aValue && typeof aValue.status === 'number';
}

/**
 * Resolves the display message for a failed HTTP response.
 * Intent: Keep toast text readable when the backend returns nested error objects.
 *
 * @param aResponse The failed HTTP response.
 * @returns The message to display in the error toast.
 */
function getRequestErrorMessage(aResponse: HttpErrorResponse<RequestErrorData>): string {
    const sData = aResponse.data;

    if (
        typeof sData === 'string' ||
        typeof sData === 'number' ||
        typeof sData === 'boolean'
    ) {
        return String(sData);
    }

    if (typeof sData === 'object' && sData !== null) {
        const sMessageContainer = sData as ErrorMessageContainer;

        if (sMessageContainer.reason !== undefined) {
            return String(sMessageContainer.reason);
        }

        if (sMessageContainer.message !== undefined) {
            return String(sMessageContainer.message);
        }

        const sSerializedData = JSON.stringify(sData);
        if (sSerializedData) {
            return sSerializedData;
        }
    }

    if (aResponse.statusText) {
        return aResponse.statusText;
    }

    return `Request failed (${aResponse.status})`;
}

/**
 * Shows a shared request error toast for failed repository responses.
 * Intent: Keep fetch-layer error presentation consistent across the tag analyzer modules.
 *
 * @param aResponse The response candidate returned by the request client.
 * @returns {void} Nothing.
 */
export function showRequestError<TData>(aResponse: RequestClientResponse<TData>): void {
    if (!isHttpErrorResponse(aResponse) || aResponse.status < 400) {
        return;
    }

    Toast.error(getRequestErrorMessage(aResponse));
}

/**
 * Resolves a table name into its qualified form.
 * Intent: Ensure unqualified tables are routed through the admin schema expected by the fetch API.
 *
 * @param aTable The table name to qualify.
 * @param aAdminId The admin schema prefix to apply when the table is unqualified.
 * @returns The qualified table name.
 */
export function getQualifiedTableName(aTable: string, aAdminId: string): string {
    const sParts = aTable.split('.');
    if (sParts.length > 1) {
        return aTable;
    }

    return `${aAdminId.toUpperCase()}.${aTable}`;
}

/**
 * Resolves the table name used by calculated fetches for non-admin users.
 * Intent: Qualify unscoped tables with the current user schema before building calculation queries.
 *
 * @param aTableName The source table name from the fetch request.
 * @returns The table name to use in the calculation query.
 */
export function getCalculationTableName(aTableName: string): string {
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
 * Calculates the number of samples to request for a chart.
 * Intent: Keep the sampling decision consistent between raw and calculated panel fetches.
 *
 * @param aLimit The current fetch limit value.
 * @param aUseSampling Whether sampling is enabled for the request.
 * @param aIsRaw Whether the request is loading raw data.
 * @param aPixelsPerTick The sampling density for calculated data.
 * @param aPixelsPerTickRaw The sampling density for raw data.
 * @param aChartWidth The visible chart width in pixels.
 * @returns The sample count to request, or -1 when sampling is not needed.
 */
export function calculateSampleCount(
    aLimit: number,
    aUseSampling: boolean,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aChartWidth: number,
): number {
    if (aLimit >= 0) {
        return -1;
    }

    const sPixelsPerTick =
        aUseSampling && aIsRaw
            ? aPixelsPerTickRaw > 0
                ? aPixelsPerTickRaw
                : 1
            : aPixelsPerTick > 0
              ? aPixelsPerTick
              : 1;

    return Math.ceil(aChartWidth / sPixelsPerTick);
}

/**
 * Normalizes requested fetch bounds into the nanosecond range expected by the backend.
 * Intent: Keep raw and calculated fetches aligned with the backend timestamp precision rules.
 *
 * @param aStartTime The requested start timestamp.
 * @param aEndTime The requested end timestamp.
 * @returns The normalized fetch time range.
 */
export function resolveFetchTimeBounds(aStartTime: number, aEndTime: number): TimeRange {
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
export function buildCsvTqlQuery(aSqlQuery: string): string {
    return `SQL("${aSqlQuery}")\nCSV()`;
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
export function buildCalculationMainQuery(
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
        return buildAverageCalculationQuery(
            aUseRollup,
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
            sValueColumnName,
            sFilterClause,
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
export function buildRawQuery(
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

    if (aSortDirection === 1) {
        sOrderBy = '1 desc';
    } else if (aSortDirection === 2) {
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

function buildAverageCalculationQuery(
    aUseRollup: boolean,
    aTimeColumnName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
    aValueColumnName: string,
    aSourceFilterClause: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sTimeBucketExpression = buildScaledCalculationTimeBucket(
        aUseRollup,
        aTimeColumnName,
        aIntervalUnit,
        aIntervalSize,
        aBucketIntervalSeconds,
    );
    const sSubQuery = `select ${sTimeBucketExpression} as mTime, sum(${aValueColumnName}) as SUMMVAL, count(${aValueColumnName}) as CNTMVAL ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

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
