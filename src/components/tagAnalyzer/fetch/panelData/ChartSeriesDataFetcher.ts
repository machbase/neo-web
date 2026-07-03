import request from '@/api/core';
import { buildCalculationSql } from '../sqlBuilder/BuildCalculationSql';
import { buildRawSeriesSql } from '../sqlBuilder/BuildRawSeriesSql';
import {
    SortOrderEnum,
    type CalculationFetchRequest,
    type ChartFetchApiResponse,
    type ChartFetchResponse,
    type RawFetchRequest,
    type TagFetchRow,
} from './PanelDataFetchTypes';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import { timeRangeMsToNanosecondsSql } from '../sqlBuilder/SqlTimeValueUtils';
import {
    getQueryResponseErrorMessage,
    getQueryRowsOrThrow,
} from '../QueryResponseUtils';

const MALFORMED_CHART_DATA_MESSAGE = 'Chart data response contained malformed rows.';
const CHART_DATA_REQUEST_FAILED_MESSAGE = 'Chart data request failed.';
const sInFlightChartSqlRequests = new Map<string, Promise<ChartFetchResponse>>();

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
        rollupColumnName: sRollupColumnName,
    } = calculationRequest;
    const sFetchTimeRange = isNumericBaseTimeSourceColumns(sColumnMap)
        ? {
              startTime: sStartTime,
              endTime: sEndTime,
          }
        : timeRangeMsToNanosecondsSql({
              startTime: sStartTime,
              endTime: sEndTime,
          });
    const sMainSql = buildCalculationSql(
        sTableName,
        sTagNameList,
        sFetchTimeRange,
        sCalculationMode,
        sRowCount,
        sIntervalUnit,
        sIntervalSize,
        sUseRollup,
        sColumnMap,
        sRollupColumnName,
    );

    return executeChartFetchSql(sMainSql);
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

    return executeChartFetchSql(sSql);
}

function parseChartQueryResponse(
    apiResponse: ChartFetchApiResponse,
): ChartFetchResponse {
    const sErrorMessage = getQueryResponseErrorMessage(
        apiResponse,
        CHART_DATA_REQUEST_FAILED_MESSAGE,
    );
    if (sErrorMessage) {
        throw new Error(sErrorMessage);
    }

    const rows = normalizeChartFetchRows(
        getQueryRowsOrThrow(apiResponse.data, MALFORMED_CHART_DATA_MESSAGE),
    );
    validateChartFetchRows(rows);

    return {
        data: {
            column: ['TIME', 'VALUE'],
            rows: rows,
        },
    };
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

        return row.map((cell, index) => {
            if (index === 1 && isDatabaseNullText(cell)) {
                return null;
            }

            return index <= 1 ? normalizeChartNumericCell(cell) : cell;
        });
    });
}

function normalizeChartNumericCell(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const sTrimmedValue = value.trim();
    if (sTrimmedValue.length === 0) {
        return value;
    }

    const sNumericValue = Number(sTrimmedValue);

    return Number.isFinite(sNumericValue) ? sNumericValue : value;
}

function isDatabaseNullText(value: unknown): boolean {
    return typeof value === 'string' && value.trim().toUpperCase() === 'NULL';
}

async function executeChartFetchSql(
    querySql: string,
): Promise<ChartFetchResponse> {
    const sExistingRequest = sInFlightChartSqlRequests.get(querySql);
    if (sExistingRequest) {
        return cloneChartFetchResponse(await sExistingRequest);
    }

    const sRequest = request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(querySql)}`,
    }).then((response) => parseChartQueryResponse(response as ChartFetchApiResponse));

    sInFlightChartSqlRequests.set(querySql, sRequest);

    try {
        return cloneChartFetchResponse(await sRequest);
    } finally {
        if (sInFlightChartSqlRequests.get(querySql) === sRequest) {
            sInFlightChartSqlRequests.delete(querySql);
        }
    }
}

function cloneChartFetchResponse(response: ChartFetchResponse): ChartFetchResponse {
    return {
        data: {
            column: [...response.data.column],
            rows: response.data.rows.map((row) => [...row] as TagFetchRow),
        },
    };
}
