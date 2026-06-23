import {
    SortOrderEnum,
    type RawFetchSampling,
    type SeriesFetchColumnMap,
} from '../FetchContracts';
import {
    AND_KEYWORD,
    AS_KEYWORD,
    DATE_RESULT_ALIAS,
    SELECT_KEYWORD,
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
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
} from './SqlTextUtils';
import type { TimeRangeNs } from '../../domain/time/model/TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from '../../domain/time/model/TimeConstants';
import { jsonValueFieldToNumericSql } from '@/utils/dashboardJsonValue';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';

const RAW_SAMPLE_FALLBACK_LIMIT = 200000;

function buildSampledRawSeriesSqlPart(rawSeriesSql: string): string {
    return buildQuerySql(
        buildSelectSqlPart('*'),
        buildSubSqlTargetSqlPart(rawSeriesSql),
        '',
        '',
        '',
        buildLimitSqlPart(RAW_SAMPLE_FALLBACK_LIMIT),
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
    const sNameColumn = buildSqlIdentifierPath(
        sourceColumnMap.name,
        'SQL tag name column',
    );
    const sTimeColumn = buildSqlIdentifierPath(
        sourceColumnMap.time,
        'SQL time column',
    );
    const sValueColumn = buildSqlIdentifierPath(
        sourceColumnMap.value,
        'SQL value column',
    );
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
    const sOrderBySql = buildOrderBySqlPart(sortOrder);
    const sSelectSql = sampling.kind === 'enabled'
        ? `${SELECT_KEYWORD}${sSamplingHintSql} ${sTimeExpression}, ${sValueExpression}`
        : buildSelectSqlPart(`${sTimeExpression}, ${sValueExpression}`);
    const rawSeriesSql = buildQuerySql(
        sSelectSql,
        buildTableTargetSqlPart(sourceTableName),
        `${WHERE_KEYWORD} ${sNameColumn} = ${buildSqlStringLiteral(tagName)} ${AND_KEYWORD} ${sTimeRangeCondition}`,
        '',
        sOrderBySql,
        sLimitSql,
    );

    return sampling.kind === 'enabled'
        ? buildSampledRawSeriesSqlPart(rawSeriesSql)
        : rawSeriesSql;
}
