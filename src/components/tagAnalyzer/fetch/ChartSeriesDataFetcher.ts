import request from '@/api/core';
import {
    buildAggregateCalculationSql,
    buildAverageCalculationSql,
    buildCountCalculationSql,
    buildFirstLastCalculationSql,
} from './sqlBuilder/BuildCalculationSql';
import { showRequestError } from './helper/FetchRequestErrorPresenter';
import { buildRawSeriesSql } from './sqlBuilder/BuildRawSeriesSql';
import { addCurrentUserSchemaIfNeeded } from './helper/TableNameSchema';
import { SortOrderEnum } from './FetchContracts';
import { convertTimeRangeMsToNanoseconds } from '../time/TimeNanosecondConverters';
import { TagzCsvParser } from '@/utils/tqlCsvParser';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    ChartFetchApiResponse,
    RawFetchRequest,
    SeriesFetchColumnMap,
} from './FetchContracts';
import type { TimeRangeNs } from '../time/TimeTypes';

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
        return undefined;
    }

    if (typeof apiResponse.data !== 'string') {
        return undefined;
    }

    return {
        data: {
            column: ['TIME', 'VALUE'],
            rows: TagzCsvParser(apiResponse.data),
        },
    };
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

export const chartSeriesDataApi = {
    fetchCalculationData,
    fetchRawData,
};
