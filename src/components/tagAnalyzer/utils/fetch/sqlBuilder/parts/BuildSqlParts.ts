import type { CalculationTimeGroupKeySqlInfo } from '../../FetchTypes';
import { SortOrderEnum } from '../../FetchTypes';
import { normalizeRollupIntervalUnit } from '../../../time/RollupIntervalUnit';
import {
    AND_KEYWORD,
    AS_KEYWORD,
    ASC_KEYWORD,
    BETWEEN_KEYWORD,
    CNTMVAL_ALIAS,
    DESC_KEYWORD,
    FROM_KEYWORD,
    GROUP_BY_M_TIME_CLAUSE,
    GROUP_BY_TIME_RESULT_CLAUSE,
    IN_KEYWORD,
    LIMIT_KEYWORD,
    M_TIME_ALIAS,
    M_VALUE_ALIAS,
    ORDER_BY_KEYWORD,
    ORDER_BY_M_TIME_CLAUSE,
    ORDER_BY_TIME_RESULT_CLAUSE,
    SECONDS_PER_HOUR,
    SECONDS_PER_MINUTE,
    SELECT_KEYWORD,
    SUMMVAL_ALIAS,
    TIME_COLUMN_NAME,
    TIME_RESULT_ALIAS,
    VALUE_RESULT_ALIAS,
    WHERE_KEYWORD,
} from '../SqlConstants';

export function buildSelectSqlPart(
    selectExpressionSql: string,
    selectPrefixSql = '',
): string {
    return selectPrefixSql
        ? `${SELECT_KEYWORD} ${selectPrefixSql} ${selectExpressionSql}`
        : `${SELECT_KEYWORD} ${selectExpressionSql}`;
}

export function buildTableTargetSqlPart(tableName: string): string {
    return `${FROM_KEYWORD} ${tableName}`;
}

export function buildSubSqlTargetSqlPart(subSql: string): string {
    return `${FROM_KEYWORD} (${subSql})`;
}

export function buildQuerySql(
    selectPartSql: string,
    targetPartSql: string,
    whereSql = '',
    groupBySql = '',
    orderBySql = '',
    limitSql = '',
): string {
    const suffixSql = [whereSql, groupBySql, orderBySql, limitSql]
        .filter(Boolean)
        .join(' ');

    return suffixSql
        ? `${selectPartSql} ${targetPartSql} ${suffixSql}`
        : `${selectPartSql} ${targetPartSql}`;
}

export function buildLimitSqlPart(limitValue: number): string {
    return `${LIMIT_KEYWORD} ${limitValue}`;
}

export function buildOrderBySqlPart(
    sortOrder: SortOrderEnum = SortOrderEnum.Unsorted,
): string {
    if (sortOrder === SortOrderEnum.Descending) {
        return `${ORDER_BY_KEYWORD} 1 ${DESC_KEYWORD}`;
    }

    if (sortOrder === SortOrderEnum.Ascending) {
        return `${ORDER_BY_KEYWORD} 1 ${ASC_KEYWORD}`;
    }

    return '';
}

export function buildRollupTimeGroupKeySqlPart(
    timeColumn: string,
    intervalType: string,
    intervalValue: number,
): string {
    return `ROLLUP('${normalizeRollupIntervalUnit(intervalType)}', ${intervalValue}, ${timeColumn})`;
}

export function buildTruncatedTimeGroupKeySqlPart(
    timeColumnName: string,
    intervalUnit: string,
    intervalSize: number,
): string {
    return `DATE_TRUNC('${intervalUnit}', ${timeColumnName}, ${intervalSize})`;
}

export function buildRollupTimeGroupKeySqlInfo(
    intervalUnit: string,
    intervalSize: number,
): CalculationTimeGroupKeySqlInfo {
    if (intervalUnit !== 'day' || intervalSize <= 1) {
        return {
            outerTimeExpressionSql: M_TIME_ALIAS,
            nonRollupBucketIntervalSeconds: 1,
        };
    }

    const rollupWindow = intervalSize * SECONDS_PER_HOUR * 24 * 1000000000;

    return {
        outerTimeExpressionSql: `to_char(${M_TIME_ALIAS} / ${rollupWindow}  * ${rollupWindow})`,
        nonRollupBucketIntervalSeconds: 1,
    };
}

export function buildNonRollupTimeGroupKeySqlInfo(
    intervalUnit: string,
): CalculationTimeGroupKeySqlInfo {
    if (intervalUnit === 'min') {
        return {
            outerTimeExpressionSql: M_TIME_ALIAS,
            nonRollupBucketIntervalSeconds: SECONDS_PER_MINUTE,
        };
    }

    if (intervalUnit === 'hour') {
        return {
            outerTimeExpressionSql: M_TIME_ALIAS,
            nonRollupBucketIntervalSeconds: SECONDS_PER_HOUR,
        };
    }

    return {
        outerTimeExpressionSql: M_TIME_ALIAS,
        nonRollupBucketIntervalSeconds: 1,
    };
}

export function buildNonRollupScaledTimeGroupKeySql(
    timeColumnName: string,
    intervalSize: number,
    bucketIntervalSeconds: number,
): string {
    const bucketSize = `${intervalSize} * ${bucketIntervalSeconds} * 1000000000`;
    return `${timeColumnName} / (${bucketSize}) * (${bucketSize})`;
}

export function buildSourceWhereSqlPart(
    tagNameColumn: string,
    tagNameList: string,
    timeSourceColumn: string,
    startTime: number,
    endTime: number,
): string {
    return `${WHERE_KEYWORD} ${tagNameColumn} ${IN_KEYWORD} ('${tagNameList}') ${AND_KEYWORD} ${timeSourceColumn} ${BETWEEN_KEYWORD} ${startTime} ${AND_KEYWORD} ${endTime}`;
}

export function buildAggregateSubSql(
    calculationMode: string,
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildGroupedSubSql(
        tableName,
        sourceWhereSql,
        timeGroupKeySql,
        `${calculationMode}(${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
    );
}

export function buildAggregateOuterSql(
    calculationMode: string,
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `${calculationMode}(${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
        requestedRowCount,
        TIME_RESULT_ALIAS,
    );
}

export function buildCountOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `SUM(${M_VALUE_ALIAS}) ${AS_KEYWORD} VALUE`,
        requestedRowCount,
        TIME_COLUMN_NAME,
    );
}

export function buildAverageOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `SUM(${SUMMVAL_ALIAS}) / SUM(${CNTMVAL_ALIAS}) ${AS_KEYWORD} VALUE`,
        requestedRowCount,
        TIME_COLUMN_NAME,
    );
}

export function buildAverageSubSql(
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildGroupedSubSql(
        tableName,
        sourceWhereSql,
        timeGroupKeySql,
        [
            `sum(${valueColumnName}) ${AS_KEYWORD} ${SUMMVAL_ALIAS}`,
            `count(${valueColumnName}) ${AS_KEYWORD} ${CNTMVAL_ALIAS}`,
        ].join(', '),
    );
}

export function buildCountSubSql(
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildGroupedSubSql(
        tableName,
        sourceWhereSql,
        timeGroupKeySql,
        `count(${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
    );
}

export function buildFirstLastSubSql(
    calculationMode: string,
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildGroupedSubSql(
        tableName,
        sourceWhereSql,
        timeGroupKeySql,
        `${calculationMode}(${TIME_COLUMN_NAME}, ${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
        ORDER_BY_M_TIME_CLAUSE,
    );
}

export function buildFirstLastOuterSql(
    calculationMode: string,
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `${calculationMode}(${M_TIME_ALIAS}, ${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
        requestedRowCount,
        TIME_RESULT_ALIAS,
    );
}

function buildGroupedSubSql(
    tableName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
    valueExpressionSql: string,
    orderBySql = '',
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            `${timeGroupKeySql} ${AS_KEYWORD} ${M_TIME_ALIAS}`,
            valueExpressionSql,
        ].join(', ')),
        buildTableTargetSqlPart(tableName),
        sourceWhereSql,
        GROUP_BY_M_TIME_CLAUSE,
        orderBySql,
    );
}

function buildGroupedOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    valueExpressionSql: string,
    requestedRowCount: number,
    timeAlias: string,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(outerTimeExpressionSql, timeAlias),
            valueExpressionSql,
        ].join(', ')),
        buildSubSqlTargetSqlPart(subSql),
        '',
        GROUP_BY_TIME_RESULT_CLAUSE,
        ORDER_BY_TIME_RESULT_CLAUSE,
        buildLimitSqlPart(requestedRowCount),
    );
}

function buildOuterTimeResultSql(
    outerTimeExpressionSql: string,
    alias: string,
): string {
    return `to_timestamp(${outerTimeExpressionSql}) / 1000000.0 ${AS_KEYWORD} ${alias}`;
}
