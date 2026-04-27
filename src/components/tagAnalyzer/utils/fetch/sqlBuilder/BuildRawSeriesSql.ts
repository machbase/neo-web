import {
    SortOrderEnum,
} from '../FetchTypes';
import type { RawFetchSampling, SeriesFetchColumnMap } from '../FetchTypes';
import {
    buildLimitSqlPart,
    buildOrderBySqlPart,
    buildQuerySql,
    buildSelectSqlPart,
    buildSubSqlTargetSqlPart,
    buildTableTargetSqlPart,
} from './parts/BuildSqlParts';
import {
    AND_KEYWORD,
    AS_KEYWORD,
    BETWEEN_KEYWORD,
    DATE_RESULT_ALIAS,
    VALUE_RESULT_ALIAS,
    WHERE_KEYWORD,
} from './SqlConstants';
import type { TimeRangeNs } from '../../time/types/TimeTypes';

function buildSampledRawSeriesSqlPart(rawSeriesSql: string): string {
    return buildQuerySql(
        buildSelectSqlPart('*'),
        buildSubSqlTargetSqlPart(rawSeriesSql),
        '',
        '',
        '',
        buildLimitSqlPart(200000),
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
    const sTimeExpression = `to_timestamp(${sTimeColumn}) / 1000000.0 ${AS_KEYWORD} ${DATE_RESULT_ALIAS}`;
    const sValueExpression = `${sValueColumn} ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`;
    const sSamplingHintSql = sampling.kind === 'enabled'
        ? `/*+ SAMPLING(${sampling.value}) */`
        : '';
    const sLimitSql = sampling.kind === 'enabled' || requestedRowCount <= 0
        ? ''
        : buildLimitSqlPart(requestedRowCount);

    const rawSeriesSql = buildQuerySql(
        buildSelectSqlPart(
            `${sTimeExpression}, ${sValueExpression}`,
            sSamplingHintSql,
        ),
        buildTableTargetSqlPart(sourceTableName),
        `${WHERE_KEYWORD} ${sNameColumn} = '${tagName}' ${AND_KEYWORD} ${sTimeColumn} ${BETWEEN_KEYWORD} ${requestedTimeRange.startTime} ${AND_KEYWORD} ${requestedTimeRange.endTime}`,
        '',
        buildOrderBySqlPart(sortOrder),
        sLimitSql,
    );

    return sampling.kind === 'enabled'
        ? buildSampledRawSeriesSqlPart(rawSeriesSql)
        : rawSeriesSql;
}
