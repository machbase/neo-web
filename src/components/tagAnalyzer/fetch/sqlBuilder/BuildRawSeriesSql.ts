import {
    SortOrderEnum,
    type RawFetchSampling,
    type SeriesFetchColumnMap,
} from '../FetchContracts';
import {
    AND_KEYWORD,
    AS_KEYWORD,
    DATE_RESULT_ALIAS,
    VALUE_RESULT_ALIAS,
    WHERE_KEYWORD,
    buildLimitSqlPart,
    buildOrderBySqlPart,
    buildQuerySql,
    buildSelectSqlPart,
    buildSubSqlTargetSqlPart,
    buildTableTargetSqlPart,
    buildTimeRangeConditionSql,
} from './parts/BuildSqlParts';
import type { TimeRangeNs } from '../../domain/time/TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from '../../domain/time/TimeConstants';
import { jsonValueFieldToNumericSql } from '@/utils/dashboardJsonValue';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';

const RAW_SAMPLE_FALLBACK_LIMIT = 200000;

function buildSampledRawSeriesSqlPart(
    rawSeriesSql: string,
    requestedRowCount: number,
    sortOrder: SortOrderEnum,
): string {
    const sSampleLimit = requestedRowCount > 0
        ? requestedRowCount
        : RAW_SAMPLE_FALLBACK_LIMIT;

    return buildQuerySql(
        buildSelectSqlPart('*'),
        buildSubSqlTargetSqlPart(rawSeriesSql),
        '',
        '',
        buildOrderBySqlPart(sortOrder),
        buildLimitSqlPart(sSampleLimit),
    );
}

export function buildRawSeriesSql(
    sourceTableName: string,
    tagName: string,
    requestedTimeRange: TimeRangeNs,
    requestedRowCount: number,
    sourceColumnMap: SeriesFetchColumnMap,
    sampling: RawFetchSampling,
    sortOrder: SortOrderEnum = SortOrderEnum.Unsorted,
): string {
    const sNameColumn = sourceColumnMap.name;
    const sTimeColumn = sourceColumnMap.time;
    const sValueColumn = sourceColumnMap.value;
    const sTimeExpression = isNumericBaseTimeSourceColumns(sourceColumnMap)
        ? `${sTimeColumn} ${AS_KEYWORD} ${DATE_RESULT_ALIAS}`
        : `to_timestamp(${sTimeColumn}) / ${NANOSECONDS_PER_MILLISECOND}.0 ${AS_KEYWORD} ${DATE_RESULT_ALIAS}`;
    const sTimeRangeCondition = buildTimeRangeConditionSql(
        sTimeColumn,
        requestedTimeRange.startTime,
        requestedTimeRange.endTime,
        !isNumericBaseTimeSourceColumns(sourceColumnMap),
    );
    const sValueExpression = `${jsonValueFieldToNumericSql(
        sValueColumn,
        sourceColumnMap.jsonKey,
    )} ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`;
    const sSamplingHintSql = sampling.kind === 'enabled'
        ? `/*+ SAMPLING(${sampling.value}) */`
        : '';
    const sLimitSql = sampling.kind === 'enabled' || requestedRowCount <= 0
        ? ''
        : buildLimitSqlPart(requestedRowCount);
    const sOrderBySql = sampling.kind === 'enabled'
        ? ''
        : buildOrderBySqlPart(sortOrder);

    const rawSeriesSql = buildQuerySql(
        buildSelectSqlPart(
            `${sTimeExpression}, ${sValueExpression}`,
            sSamplingHintSql,
        ),
        buildTableTargetSqlPart(sourceTableName),
        `${WHERE_KEYWORD} ${sNameColumn} = '${tagName}' ${AND_KEYWORD} ${sTimeRangeCondition}`,
        '',
        sOrderBySql,
        sLimitSql,
    );

    return sampling.kind === 'enabled'
        ? buildSampledRawSeriesSqlPart(rawSeriesSql, requestedRowCount, sortOrder)
        : rawSeriesSql;
}
