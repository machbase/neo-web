import request from '@/api/core';
import { toStoredTimeRangeInput } from '../time/StoredTimeRangeAdapter';
import {
    buildAggregateCalculationSql,
    buildAverageCalculationSql,
    buildCountCalculationSql,
    buildFirstLastCalculationSql,
} from './sqlBuilder/BuildCalculationSql';
import { showRequestError } from './FetchRequestErrorPresenter';
import { buildRawSeriesSql } from './sqlBuilder/BuildRawSeriesSql';
import { buildTqlCsvPayload } from './TqlCsvPayloadBuilder';
import { parseChartCsvResponse } from './parsing/ChartFetchResponseParser';
import { parseFetchTableListResponse } from './parsing/TableListParser';
import { resolveTimeBoundaryRanges } from '../time/TimeBoundaryRangeResolver';
import type { PanelSeriesConfig } from '../series/PanelSeriesTypes';
import { addCurrentUserSchemaIfNeeded } from './CurrentUserSchemaTableName';
import { SortOrderEnum } from './FetchTypes';
import { convertTimeRangeMsToNanoseconds } from '../time/UnixTimeConverters';
import type {
    CalculationFetchRequest,
    ChartFetchResponse,
    ChartFetchApiResponse,
    RawFetchRequest,
    RollupTableMap,
    SeriesFetchColumnMap,
    TableListFetchResponse,
    TopLevelTimeBoundaryResponse,
} from './FetchTypes';
import type { ResolvedTimeBounds, TimeRangeNs } from '../time/types/TimeTypes';

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

export async function fetchTablesData() {
    const sData = await request({
        method: 'GET',
        url: '/api/tables',
    });
    showRequestError(sData);

    return sData;
}

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

export const tagAnalyzerDataApi = {
    fetchCalculationData,
    fetchRawData,
    fetchTablesData,
    getRollupTableList,
};

export async function fetchParsedTables(): Promise<string[] | undefined> {
    return parseFetchTableListResponse(
        (await tagAnalyzerDataApi.fetchTablesData()) as TableListFetchResponse,
    );
}

export async function fetchTopLevelTimeBoundaryRanges(
    tagSet: PanelSeriesConfig[],
    boardTime: ResolvedTimeBounds,
): Promise<TopLevelTimeBoundaryResponse> {
    return (await resolveTimeBoundaryRanges(
        tagSet,
        toStoredTimeRangeInput(boardTime),
        {
            bgn: '',
            end: '',
        },
    )) ?? null;
}
