import request from '@/api/core';
import {
    buildAggregateCalculationSql,
    buildAverageCalculationSql,
    buildCountCalculationSql,
    buildFirstLastCalculationSql,
} from '../sqlBuilder/BuildCalculationSql';
import { buildRawSeriesSql } from '../sqlBuilder/BuildRawSeriesSql';
import { addCurrentUserSchemaIfNeeded } from './TableNameQualification';
import {
    SortOrderEnum,
    type CalculationFetchRequest,
    type ChartFetchApiResponse,
    type ChartFetchResponse,
    type RawFetchRequest,
    type RollupTableMap,
    type SeriesFetchColumnMap,
    type TagFetchRow,
} from './PanelDataFetchTypes';
import type { TimeRangeNs } from '../../domain/time/TimeTypes';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import { timeRangeMsToNanosecondsSql } from '../sqlBuilder/SqlTimeValueUtils';

const MALFORMED_CHART_DATA_MESSAGE = 'Chart data response contained malformed rows.';

export async function fetchCalculationData(
    calculationRequest: CalculationFetchRequest,
): Promise<ChartFetchResponse> {
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
        : timeRangeMsToNanosecondsSql({
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

    console.log('[TagAnalyzer chart fetch] calculation request', {
        request: calculationRequest,
        sql: sMainSql,
    });

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
    rollupTableList: RollupTableMap,
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
            throw new Error(`Unsupported calculation mode: ${calculationMode}`);
    }
}

export async function fetchRawData(
    rawRequest: RawFetchRequest,
): Promise<ChartFetchResponse> {
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
        : timeRangeMsToNanosecondsSql({
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

    console.log('[TagAnalyzer chart fetch] raw request', {
        request: rawRequest,
        sql: sSql,
    });

    return executeChartFetchSql(sSql);
}

function parseChartQueryResponse(
    apiResponse: ChartFetchApiResponse,
): ChartFetchResponse {
    if (typeof apiResponse.status === 'number' && apiResponse.status >= 400) {
        throw new Error(getChartFetchErrorMessage(apiResponse));
    }

    if (apiResponse.success === false) {
        throw new Error(getChartFetchErrorMessage(apiResponse));
    }

    const rows = normalizeChartFetchRows(getChartFetchRows(apiResponse.data));
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

    const sTopLevelMessage = getChartFetchTopLevelMessage(apiResponse);
    if (sTopLevelMessage) {
        return sTopLevelMessage;
    }

    return apiResponse.statusText ?? 'Chart data request failed.';
}

function getChartFetchRows(data: unknown): unknown[] {
    if (typeof data !== 'object' || data === null || !('rows' in data)) {
        throw new Error(MALFORMED_CHART_DATA_MESSAGE);
    }

    const rows = (data as { rows: unknown }).rows;
    if (!Array.isArray(rows)) {
        throw new Error(MALFORMED_CHART_DATA_MESSAGE);
    }

    return rows;
}

function getChartFetchTopLevelMessage(apiResponse: ChartFetchApiResponse): string | undefined {
    if (apiResponse.reason !== undefined) {
        return String(apiResponse.reason);
    }

    if (apiResponse.message !== undefined) {
        return String(apiResponse.message);
    }

    if (apiResponse.error !== undefined) {
        return String(apiResponse.error);
    }

    return undefined;
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

function validateChartFetchRows(rows: unknown[]): asserts rows is TagFetchRow[] {
    for (const row of rows) {
        if (
            !Array.isArray(row) ||
            row.length < 2 ||
            typeof row[0] !== 'number' ||
            (typeof row[1] !== 'number' && row[1] !== null) ||
            !Number.isFinite(row[0]) ||
            (typeof row[1] === 'number' && !Number.isFinite(row[1]))
        ) {
            throw new Error(MALFORMED_CHART_DATA_MESSAGE);
        }
    }
}

function normalizeChartFetchRows(rows: unknown[]): unknown[] {
    return rows.map((row) => {
        if (!Array.isArray(row)) {
            return row;
        }

        return row.map((cell, index) =>
            index === 1 && isDatabaseNullText(cell)
                ? null
                : cell,
        );
    });
}

function isDatabaseNullText(value: unknown): boolean {
    return typeof value === 'string' && value.trim().toUpperCase() === 'NULL';
}

async function executeChartFetchSql(
    querySql: string,
): Promise<ChartFetchResponse> {
    console.log('[TagAnalyzer chart fetch] query SQL', querySql);

    const response = (await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(querySql)}`,
    })) as ChartFetchApiResponse;

    console.log('[TagAnalyzer chart fetch] response', {
        status: response.status,
        success: response.success,
        rowCount: getChartFetchResponseRowCount(response),
        sampleRows: getChartFetchResponseSampleRows(response),
        response,
    });

    return parseChartQueryResponse(response);
}

function getChartFetchResponseRowCount(
    response: ChartFetchApiResponse,
): number | undefined {
    const sRows = getChartFetchResponseRowsOrUndefined(response);
    return sRows?.length;
}

function getChartFetchResponseSampleRows(
    response: ChartFetchApiResponse,
): unknown[] | undefined {
    const sRows = getChartFetchResponseRowsOrUndefined(response);
    return sRows?.slice(0, 3);
}

function getChartFetchResponseRowsOrUndefined(
    response: ChartFetchApiResponse,
): unknown[] | undefined {
    const sData = response.data;
    if (typeof sData !== 'object' || sData === null || !('rows' in sData)) {
        return undefined;
    }

    const sRows = (sData as { rows?: unknown }).rows;
    return Array.isArray(sRows) ? sRows : undefined;
}
