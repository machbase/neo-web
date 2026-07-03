import {
    SortOrderEnum,
    type CalculationTimeGroupKeySqlInfo,
} from '../../panelData/PanelDataFetchTypes';
import {
    normalizeDateBinIntervalUnit,
    normalizeRollupIntervalUnit,
} from '../SqlIntervalUnitUtils';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
    buildSqlStringLiteralList,
    indentSql,
    joinSqlLines,
} from '../SqlTextUtils';
import {
    toQueryResultMillisecondsSql,
    toQueryTimeLiteralSql,
} from '../SqlTimeValueUtils';

export const SELECT_KEYWORD = 'SELECT';
const FROM_KEYWORD = 'FROM';
export const WHERE_KEYWORD = 'WHERE';
export const AND_KEYWORD = 'AND';
export const IN_KEYWORD = 'IN';
const BETWEEN_KEYWORD = 'BETWEEN';
export const AS_KEYWORD = 'AS';
const GROUP_BY_KEYWORD = 'GROUP BY';
const ORDER_BY_KEYWORD = 'ORDER BY';
const LIMIT_KEYWORD = 'LIMIT';
export const UNION_ALL_KEYWORD = 'UNION ALL';
const ASC_KEYWORD = 'ASC';
const DESC_KEYWORD = 'DESC';

export const M_TIME_ALIAS = 'mTime';
export const M_VALUE_ALIAS = 'mValue';
export const SUMMVAL_ALIAS = 'SUMMVAL';
export const CNTMVAL_ALIAS = 'CNTMVAL';

const TIME_RESULT_ALIAS = 'time';
export const VALUE_RESULT_ALIAS = 'value';
export const DATE_RESULT_ALIAS = 'date';

const TIME_COLUMN_NAME = 'TIME';
export const NAME_COLUMN_NAME = 'NAME';
export const MIN_TIME_COLUMN_NAME = 'min_time';
export const MAX_TIME_COLUMN_NAME = 'max_time';
export const MIN_TIME_RESULT_ALIAS = 'min_tm';
export const MAX_TIME_RESULT_ALIAS = 'max_tm';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const GROUP_BY_M_TIME_CLAUSE = `${GROUP_BY_KEYWORD} ${M_TIME_ALIAS}`;
const ORDER_BY_M_TIME_CLAUSE = `${ORDER_BY_KEYWORD} ${M_TIME_ALIAS}`;

export function buildSelectSqlPart(
    selectExpressionSql: string,
    selectPrefixSql = '',
): string {
    return selectPrefixSql
        ? `${SELECT_KEYWORD} ${selectPrefixSql} ${selectExpressionSql}`
        : `${SELECT_KEYWORD} ${selectExpressionSql}`;
}

export function buildTableTargetSqlPart(tableName: string): string {
    return `${FROM_KEYWORD} ${buildSqlIdentifierPath(tableName, 'SQL table name')}`;
}

export function buildSubSqlTargetSqlPart(subSql: string): string {
    return joinSqlLines([
        `${FROM_KEYWORD} (`,
        indentSql(subSql),
        ')',
    ]);
}

export function buildQuerySql(
    selectPartSql: string,
    targetPartSql: string,
    whereSql = '',
    groupBySql = '',
    orderBySql = '',
    limitSql = '',
): string {
    return joinSqlLines([
        selectPartSql,
        targetPartSql,
        whereSql,
        groupBySql,
        orderBySql,
        limitSql,
    ]);
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
    return `ROLLUP(${buildSqlStringLiteral(
        normalizeRollupIntervalUnit(intervalType),
    )}, ${intervalValue}, ${buildSqlIdentifierPath(timeColumn, 'SQL time column')})`;
}

export function buildDateBinTimeGroupKeySqlPart(
    timeColumnName: string,
    intervalUnit: string,
    intervalSize: number,
): string {
    return `DATE_BIN(${buildSqlStringLiteral(
        normalizeDateBinIntervalUnit(intervalUnit),
    )}, ${intervalSize}, ${buildSqlIdentifierPath(timeColumnName, 'SQL time column')})`;
}

export function buildRollupTimeGroupKeySqlInfo(): CalculationTimeGroupKeySqlInfo {
    return {
        outerTimeExpressionSql: M_TIME_ALIAS,
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

export function buildSourceWhereSqlPart(
    tagNameColumn: string,
    tagNameList: string | string[],
    timeSourceColumn: string,
    startTime: number | string,
    endTime: number | string,
    compareTimestampValue = false,
): string {
    const sTagNames = Array.isArray(tagNameList) ? tagNameList : [tagNameList];

    return joinSqlLines([
        `${WHERE_KEYWORD} ${buildSqlIdentifierPath(
            tagNameColumn,
            'SQL tag name column',
        )} ${IN_KEYWORD} (${buildSqlStringLiteralList(sTagNames)})`,
        `  ${AND_KEYWORD} ${buildTimeRangeConditionSql(
            timeSourceColumn,
            startTime,
            endTime,
            compareTimestampValue,
        )}`,
    ]);
}

export function buildTimeRangeConditionSql(
    timeSourceColumn: string,
    startTime: number | string,
    endTime: number | string,
    compareTimestampValue = false,
): string {
    const sTimeSourceColumn = buildSqlIdentifierPath(
        timeSourceColumn,
        'SQL time column',
    );

    return `${sTimeSourceColumn} ${BETWEEN_KEYWORD} ${toQueryTimeLiteralSql(
        startTime,
        compareTimestampValue,
    )} ${AND_KEYWORD} ${toQueryTimeLiteralSql(endTime, compareTimestampValue)}`;
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
    outerValueExpressionSql = `${calculationMode}(${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        outerValueExpressionSql,
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
    outerValueExpressionSql = `${SUMMVAL_ALIAS} / ${CNTMVAL_ALIAS} ${AS_KEYWORD} VALUE`,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(
                outerTimeExpressionSql,
                TIME_COLUMN_NAME,
                convertOuterTimeToTimestamp,
            ),
            outerValueExpressionSql,
        ].join(',\n    ')),
        buildSubSqlTargetSqlPart(subSql),
        `${WHERE_KEYWORD} ${CNTMVAL_ALIAS} > 0`,
        '',
        `${ORDER_BY_KEYWORD} ${outerTimeExpressionSql}`,
        buildLimitSqlPart(requestedRowCount),
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
        ].join(',\n    '),
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
    outerValueExpressionSql = `${calculationMode}(${M_TIME_ALIAS}, ${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
): string {
    return buildGroupedOuterSql(
        subSql,
        outerTimeExpressionSql,
        outerValueExpressionSql,
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
        ].join(',\n    ')),
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
    outerWhereSql = '',
): string {
    const sOuterTimeGroupExpression = convertOuterTimeToTimestamp
        ? TIME_COLUMN_NAME
        : outerTimeExpressionSql;

    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(
                outerTimeExpressionSql,
                timeAlias,
                convertOuterTimeToTimestamp,
            ),
            valueExpressionSql,
        ].join(',\n    ')),
        buildSubSqlTargetSqlPart(subSql),
        outerWhereSql,
        `${GROUP_BY_KEYWORD} ${sOuterTimeGroupExpression}`,
        `${ORDER_BY_KEYWORD} ${sOuterTimeGroupExpression}`,
        buildLimitSqlPart(requestedRowCount),
    );
}

function buildOuterTimeResultSql(
    outerTimeExpressionSql: string,
    alias: string,
    convertOuterTimeToTimestamp: boolean,
): string {
    return convertOuterTimeToTimestamp
        ? `${toQueryResultMillisecondsSql(outerTimeExpressionSql)} ${AS_KEYWORD} ${alias}`
        : `${outerTimeExpressionSql} ${AS_KEYWORD} ${alias}`;
}
