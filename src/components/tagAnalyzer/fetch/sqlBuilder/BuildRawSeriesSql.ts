import {
    SortOrderEnum,
} from '../FetchContracts';
import type { RawFetchSampling, SeriesFetchColumnMap } from '../FetchContracts';
import {
    AND_KEYWORD,
    AS_KEYWORD,
    BETWEEN_KEYWORD,
    DATE_RESULT_ALIAS,
    VALUE_RESULT_ALIAS,
    WHERE_KEYWORD,
    buildLimitSqlPart,
    buildOrderBySqlPart,
    buildQuerySql,
    buildSelectSqlPart,
    buildSubSqlTargetSqlPart,
    buildTableTargetSqlPart,
} from './parts/BuildSqlParts';
import type { TimeRangeNs } from '../../time/TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from '../../time/TimeConstants';
import { jsonValueFieldToNumericSql } from '@/utils/dashboardJsonValue';

const RAW_SAMPLE_FALLBACK_LIMIT = 200000;

function buildSampledRawSeriesSqlPart(
    rawSeriesSql: string,
    requestedRowCount: number,
    sortOrder: SortOrderEnum,
): string {
    const sSampleLimit = requestedRowCount > 0
        ? requestedRowCount
        : RAW_SAMPLE_FALLBACK_LIMIT;
    const sLimitedSampleSql = buildQuerySql(
        buildSelectSqlPart('*'),
        buildSubSqlTargetSqlPart(rawSeriesSql),
        '',
        '',
        '',
        buildLimitSqlPart(sSampleLimit),
    );

    return buildQuerySql(
        buildSelectSqlPart('*'),
        buildSubSqlTargetSqlPart(sLimitedSampleSql),
        '',
        '',
        buildOrderBySqlPart(sortOrder),
        '',
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
    const sTimeExpression = `to_timestamp(${sTimeColumn}) / ${NANOSECONDS_PER_MILLISECOND}.0 ${AS_KEYWORD} ${DATE_RESULT_ALIAS}`;
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
        `${WHERE_KEYWORD} ${sNameColumn} = '${tagName}' ${AND_KEYWORD} ${sTimeColumn} ${BETWEEN_KEYWORD} ${requestedTimeRange.startTime} ${AND_KEYWORD} ${requestedTimeRange.endTime}`,
        '',
        sOrderBySql,
        sLimitSql,
    );

    return sampling.kind === 'enabled'
        ? buildSampledRawSeriesSqlPart(rawSeriesSql, requestedRowCount, sortOrder)
        : rawSeriesSql;
}
