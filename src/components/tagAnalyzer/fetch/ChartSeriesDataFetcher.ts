import request from '@/api/core';
import {
    buildAggregateCalculationSql,
    buildAverageCalculationSql,
    buildCountCalculationSql,
    buildFirstLastCalculationSql,
} from './sqlBuilder/BuildCalculationSql';
import { showRequestError } from '../feedback/RequestErrorPresenter';
import { buildRawSeriesSql } from './sqlBuilder/BuildRawSeriesSql';
import { addCurrentUserSchemaIfNeeded } from './TableNameSchema';
import {
    SortOrderEnum,
    type CalculationFetchRequest,
    type ChartFetchApiResponse,
    type ChartFetchResponse,
    type RawFetchRequest,
    type SeriesFetchColumnMap,
    type TagFetchRow,
} from './FetchContracts';
import { TagzCsvParser } from '@/utils/tqlCsvParser';
import type { TimeRangeMs, TimeRangeNs } from '../domain/time/TimeTypes';
import { isNumericBaseTimeSourceColumns } from '../domain/SeriesDomain';
import { NANOSECONDS_PER_MILLISECOND } from '../domain/time/TimeConstants';

const MALFORMED_CHART_DATA_MESSAGE = 'Chart data response contained malformed rows.';
const USER_PRESENTED_ERROR_KEY = 'tagAnalyzerUserPresented';

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
    const sFetchTimeRange = isNumericBaseTimeSourceColumns(sColumnMap)
        ? {
              startTime: sStartTime,
              endTime: sEndTime,
          }
        : convertTimeRangeMsToNanoseconds({
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

    return executeChartFetchSql(sMainSql);
}

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

function convertTimeRangeMsToNanoseconds(timeRange: TimeRangeMs): TimeRangeNs {
    return {
        startTime: timeRange.startTime * NANOSECONDS_PER_MILLISECOND,
        endTime: timeRange.endTime * NANOSECONDS_PER_MILLISECOND,
    };
}

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
    const sFetchTimeRange = isNumericBaseTimeSourceColumns(sColumnMap)
        ? {
              startTime: sStartTime,
              endTime: sEndTime,
          }
        : convertTimeRangeMsToNanoseconds({
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

    return executeChartFetchSql(sSql);
}

function buildTqlCsvPayload(sqlQuery: string): string {
    return `SQL("${sqlQuery}")\nCSV()`;
}

function parseChartCsvResponse(
    apiResponse: ChartFetchApiResponse,
): ChartFetchResponse | undefined {
    if (apiResponse.status >= 400) {
        showRequestError(apiResponse);
        throw createUserPresentedChartFetchError(getChartFetchErrorMessage(apiResponse));
    }

    if (typeof apiResponse.data !== 'string') {
        throw new Error(getChartFetchErrorMessage(apiResponse));
    }

    const rows = TagzCsvParser(apiResponse.data);
    validateChartFetchRows(rows);

    return {
        data: {
            column: ['TIME', 'VALUE'],
            rows: rows,
        },
    };
}

function getChartFetchErrorMessage(apiResponse: ChartFetchApiResponse): string {
    if (typeof apiResponse.data === 'string' && apiResponse.data.length > 0) {
        return apiResponse.data;
    }

    const sDataMessage = getChartFetchDataMessage(apiResponse.data);
    if (sDataMessage) {
        return sDataMessage;
    }

    return apiResponse.statusText ?? `Chart data request failed (${apiResponse.status}).`;
}

function getChartFetchDataMessage(data: unknown): string | undefined {
    if (data === null || data === undefined) {
        return undefined;
    }

    if (
        typeof data === 'string' ||
        typeof data === 'number' ||
        typeof data === 'boolean'
    ) {
        return String(data);
    }

    if (typeof data !== 'object') {
        return undefined;
    }

    const sMessageContainer = data as {
        reason?: unknown;
        message?: unknown;
        error?: unknown;
    };

    if (sMessageContainer.reason !== undefined) {
        return String(sMessageContainer.reason);
    }

    if (sMessageContainer.message !== undefined) {
        return String(sMessageContainer.message);
    }

    if (sMessageContainer.error !== undefined) {
        return String(sMessageContainer.error);
    }

    const sSerializedData = JSON.stringify(data);
    return sSerializedData || undefined;
}

function createUserPresentedChartFetchError(message: string): Error {
    const error = new Error(message);

    Object.defineProperty(error, USER_PRESENTED_ERROR_KEY, {
        value: true,
        enumerable: false,
    });

    return error;
}

function validateChartFetchRows(rows: unknown): asserts rows is TagFetchRow[] {
    if (!Array.isArray(rows)) {
        throw new Error(MALFORMED_CHART_DATA_MESSAGE);
    }

    for (const row of rows) {
        if (
            !Array.isArray(row) ||
            row.length < 2 ||
            typeof row[0] !== 'number' ||
            typeof row[1] !== 'number' ||
            !Number.isFinite(row[0]) ||
            !Number.isFinite(row[1])
        ) {
            throw new Error(MALFORMED_CHART_DATA_MESSAGE);
        }
    }
}

async function executeChartFetchSql(
    querySql: string,
): Promise<ChartFetchResponse | undefined> {
    const tqlCsvPayload = buildTqlCsvPayload(querySql);
    const response = (await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: tqlCsvPayload,
    })) as ChartFetchApiResponse;

    return parseChartCsvResponse(response);
}
