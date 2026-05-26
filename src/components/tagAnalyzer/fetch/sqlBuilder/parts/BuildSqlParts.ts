import {
    SortOrderEnum,
    type CalculationTimeGroupKeySqlInfo,
} from '../../FetchContracts';
import {
    normalizeRollupIntervalUnit,
    normalizeTruncatedIntervalUnit,
} from '../SqlIntervalUnitUtils';
import { NANOSECONDS_PER_MILLISECOND } from '../../../domain/time/TimeConstants';

const NANOSECONDS_PER_SECOND = 1000 * NANOSECONDS_PER_MILLISECOND;

export const SELECT_KEYWORD = 'SELECT';
export const FROM_KEYWORD = 'FROM';
export const WHERE_KEYWORD = 'WHERE';
export const AND_KEYWORD = 'AND';
export const IN_KEYWORD = 'IN';
export const BETWEEN_KEYWORD = 'BETWEEN';
export const AS_KEYWORD = 'AS';
export const GROUP_BY_KEYWORD = 'GROUP BY';
export const ORDER_BY_KEYWORD = 'ORDER BY';
export const LIMIT_KEYWORD = 'LIMIT';
export const UNION_ALL_KEYWORD = 'UNION ALL';
export const ASC_KEYWORD = 'ASC';
export const DESC_KEYWORD = 'DESC';

export const M_TIME_ALIAS = 'mTime';
export const M_VALUE_ALIAS = 'mValue';
export const SUMMVAL_ALIAS = 'SUMMVAL';
export const CNTMVAL_ALIAS = 'CNTMVAL';

export const TIME_RESULT_ALIAS = 'time';
export const VALUE_RESULT_ALIAS = 'value';
export const DATE_RESULT_ALIAS = 'date';

export const TIME_COLUMN_NAME = 'TIME';
export const NAME_COLUMN_NAME = 'NAME';
export const MIN_TIME_COLUMN_NAME = 'min_time';
export const MAX_TIME_COLUMN_NAME = 'max_time';
export const MIN_TIME_RESULT_ALIAS = 'min_tm';
export const MAX_TIME_RESULT_ALIAS = 'max_tm';

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;

export const GROUP_BY_M_TIME_CLAUSE = `${GROUP_BY_KEYWORD} ${M_TIME_ALIAS}`;
export const ORDER_BY_M_TIME_CLAUSE = `${ORDER_BY_KEYWORD} ${M_TIME_ALIAS}`;
export const GROUP_BY_TIME_RESULT_CLAUSE = `${GROUP_BY_KEYWORD} TIME`;
export const ORDER_BY_TIME_RESULT_CLAUSE = `${ORDER_BY_KEYWORD} TIME`;

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
    return `DATE_TRUNC('${normalizeTruncatedIntervalUnit(intervalUnit)}', ${timeColumnName}, ${intervalSize})`;
}

export function buildRollupTimeGroupKeySqlInfo(
    intervalUnit: string,
    intervalSize: number,
): CalculationTimeGroupKeySqlInfo {
    if ((intervalUnit !== 'd' && intervalUnit !== 'day') || intervalSize <= 1) {
        return {
            outerTimeExpressionSql: M_TIME_ALIAS,
            nonRollupBucketIntervalSeconds: 1,
        };
    }

    const rollupWindow = intervalSize * SECONDS_PER_HOUR * 24 * NANOSECONDS_PER_SECOND;

    return {
        outerTimeExpressionSql: `to_char(${M_TIME_ALIAS} / ${rollupWindow}  * ${rollupWindow})`,
        nonRollupBucketIntervalSeconds: 1,
    };
}

export function buildNonRollupTimeGroupKeySqlInfo(
    intervalUnit: string,
): CalculationTimeGroupKeySqlInfo {
    if (
        intervalUnit === 'm' ||
        intervalUnit === 'min' ||
        intervalUnit === 'minute'
    ) {
        return {
            outerTimeExpressionSql: M_TIME_ALIAS,
            nonRollupBucketIntervalSeconds: SECONDS_PER_MINUTE,
        };
    }

    if (intervalUnit === 'h' || intervalUnit === 'hour') {
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
    const bucketSize = `${intervalSize} * ${bucketIntervalSeconds} * ${NANOSECONDS_PER_SECOND}`;
    return `${timeColumnName} / (${bucketSize}) * (${bucketSize})`;
}

export function buildSourceWhereSqlPart(
    tagNameColumn: string,
    tagNameList: string,
    timeSourceColumn: string,
    startTime: number,
    endTime: number,
    compareTimestampValue = false,
): string {
    return `${WHERE_KEYWORD} ${tagNameColumn} ${IN_KEYWORD} ('${tagNameList}') ${AND_KEYWORD} ${buildTimeRangeConditionSql(timeSourceColumn, startTime, endTime, compareTimestampValue)}`;
}

export function buildTimeRangeConditionSql(
    timeSourceColumn: string,
    startTime: number,
    endTime: number,
    compareTimestampValue = false,
): string {
    const sTimeExpression = compareTimestampValue
        ? `to_timestamp(${timeSourceColumn})`
        : timeSourceColumn;

    return `${sTimeExpression} ${BETWEEN_KEYWORD} ${startTime} ${AND_KEYWORD} ${endTime}`;
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
    convertOuterTimeToTimestamp = true,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `${calculationMode}(${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
        requestedRowCount,
        TIME_RESULT_ALIAS,
        convertOuterTimeToTimestamp,
    );
}

export function buildCountOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
    convertOuterTimeToTimestamp = true,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `SUM(${M_VALUE_ALIAS}) ${AS_KEYWORD} VALUE`,
        requestedRowCount,
        TIME_COLUMN_NAME,
        convertOuterTimeToTimestamp,
    );
}

export function buildAverageOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
    convertOuterTimeToTimestamp = true,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `SUM(${SUMMVAL_ALIAS}) / SUM(${CNTMVAL_ALIAS}) ${AS_KEYWORD} VALUE`,
        requestedRowCount,
        TIME_COLUMN_NAME,
        convertOuterTimeToTimestamp,
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
    timeValueColumnName = TIME_COLUMN_NAME,
): string {
    return buildGroupedSubSql(
        tableName,
        sourceWhereSql,
        timeGroupKeySql,
        `${calculationMode}(${timeValueColumnName}, ${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
        ORDER_BY_M_TIME_CLAUSE,
    );
}

export function buildFirstLastOuterSql(
    calculationMode: string,
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
    convertOuterTimeToTimestamp = true,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        `${calculationMode}(${M_TIME_ALIAS}, ${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
        requestedRowCount,
        TIME_RESULT_ALIAS,
        convertOuterTimeToTimestamp,
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
    convertOuterTimeToTimestamp: boolean,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(
                outerTimeExpressionSql,
                timeAlias,
                convertOuterTimeToTimestamp,
            ),
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
    convertOuterTimeToTimestamp: boolean,
): string {
    return convertOuterTimeToTimestamp
        ? `to_timestamp(${outerTimeExpressionSql}) / ${NANOSECONDS_PER_MILLISECOND}.0 ${AS_KEYWORD} ${alias}`
        : `${outerTimeExpressionSql} ${AS_KEYWORD} ${alias}`;
}
