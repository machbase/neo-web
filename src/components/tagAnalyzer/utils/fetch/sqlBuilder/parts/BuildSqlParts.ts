import type { CalculationTimeGroupKeySqlInfo } from '../../FetchTypes';
import { SortOrderEnum } from '../../FetchTypes';
import { normalizeRollupIntervalUnit } from '../../../time/RollupIntervalUnit';
import {
    ASC_KEYWORD,
    AND_KEYWORD,
    AS_KEYWORD,
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
    SELECT_KEYWORD,
    SECONDS_PER_HOUR,
    SECONDS_PER_MINUTE,
    SUMMVAL_ALIAS,
    TIME_COLUMN_NAME,
    TIME_RESULT_ALIAS,
    VALUE_RESULT_ALIAS,
    WHERE_KEYWORD,
} from '../SqlConstants';

/**
 * Builds a `SELECT ...` SQL part.
 * Intent: Keep the select portion explicit so query builders can assemble full SQL from named parts.
 * @param {string} selectExpressionSql - The comma-separated expressions to place after `SELECT`.
 * @param {string} [selectPrefixSql] - The optional SQL prefix that should appear right after `SELECT`.
 * @returns {string} The `SELECT ...` SQL part.
 */
export function buildSelectSqlPart(
    selectExpressionSql: string,
    selectPrefixSql: string = '',
): string {
    const sSelectPrefix = selectPrefixSql.length > 0
        ? `${selectPrefixSql} `
        : '';

    return `${SELECT_KEYWORD} ${sSelectPrefix}${selectExpressionSql}`;
}

/**
 * Builds a table target SQL part.
 * Intent: Keep plain table-name targets explicit so query builders can pass a named `FROM` part around.
 * @param {string} tableName - The table name to read from.
 * @returns {string} The `FROM ...` SQL part.
 */
export function buildTableTargetSqlPart(tableName: string): string {
    return `${FROM_KEYWORD} ${tableName}`;
}

/**
 * Builds a sub-SQL target SQL part.
 * Intent: Keep nested `FROM (<sql>)` targets explicit so query builders can pass a named `FROM` part around.
 * @param {string} subSql - The sub-SQL to wrap.
 * @returns {string} The `FROM (...)` SQL part.
 */
export function buildSubSqlTargetSqlPart(subSql: string): string {
    return `${FROM_KEYWORD} (${subSql})`;
}

/**
 * Builds a full SQL query from named parts.
 * Intent: Keep query assembly in one helper while letting callers build select, target, and condition parts explicitly.
 * @param {string} selectPartSql - The prepared `SELECT ...` SQL part.
 * @param {string} targetPartSql - The prepared `FROM ...` SQL part.
 * @param {string} [whereSql] - The prepared `WHERE ...` SQL part.
 * @param {string} [groupBySql] - The prepared `GROUP BY ...` SQL part.
 * @param {string} [orderBySql] - The prepared `ORDER BY ...` SQL part.
 * @param {string} [limitSql] - The prepared `LIMIT ...` SQL part.
 * @returns {string} The full SQL query.
 */
export function buildQuerySql(
    selectPartSql: string,
    targetPartSql: string,
    whereSql: string = '',
    groupBySql: string = '',
    orderBySql: string = '',
    limitSql: string = '',
): string {
    const conditionSql = [whereSql, groupBySql, orderBySql, limitSql]
        .filter((part) => part.length > 0)
        .join(' ');
    const sOptionalConditionSql = conditionSql.length > 0
        ? ` ${conditionSql}`
        : '';

    return `${selectPartSql} ${targetPartSql}${sOptionalConditionSql}`;
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

/**
 * Builds the rollup time-group-key SQL expression used by fetch SQL.
 * Intent: Keep rollup time-group-key SQL formatting in one reusable SQL part.
 * @param timeColumn The source time column name.
 * @param intervalType The rollup interval unit.
 * @param intervalValue The rollup interval size.
 * @returns The rollup SQL time-group-key expression.
 */
export function buildRollupTimeGroupKeySqlPart(
    timeColumn: string,
    intervalType: string,
    intervalValue: number,
): string {
    return `ROLLUP('${normalizeRollupIntervalUnit(intervalType)}', ${intervalValue}, ${timeColumn})`;
}

/**
 * Builds the truncated time-group-key SQL expression used by fetch SQL.
 * Intent: Keep non-rollup truncated time-group-key SQL formatting in one reusable SQL part.
 * @param {string} timeColumnName - The source time column name.
 * @param {string} intervalUnit - The interval unit used for truncation.
 * @param {number} intervalSize - The interval size used for truncation.
 * @returns {string} The truncated time-group-key SQL expression.
 */
export function buildTruncatedTimeGroupKeySqlPart(
    timeColumnName: string,
    intervalUnit: string,
    intervalSize: number,
): string {
    return `DATE_TRUNC('${intervalUnit}', ${timeColumnName}, ${intervalSize})`;
}

function buildOuterTimeResultSql(
    outerTimeExpressionSql: string,
    alias: string,
): string {
    return `to_timestamp(${outerTimeExpressionSql}) / 1000000.0 ${AS_KEYWORD} ${alias}`;
}

export function buildRollupTimeGroupKeySqlInfo(
    intervalUnit: string,
    intervalSize: number,
): CalculationTimeGroupKeySqlInfo {
    if (intervalUnit === 'day' && intervalSize > 1) {
        const sRollupWindow = intervalSize * SECONDS_PER_HOUR * 24 * 1000000000;

        return {
            outerTimeExpressionSql: `to_char(${M_TIME_ALIAS} / ${sRollupWindow}  * ${sRollupWindow})`,
            nonRollupBucketIntervalSeconds: 1,
        };
    }

    return {
        outerTimeExpressionSql: M_TIME_ALIAS,
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
    const sBucketSize = `${intervalSize} * ${bucketIntervalSeconds} * 1000000000`;
    return `${timeColumnName} / (${sBucketSize}) * (${sBucketSize})`;
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

/**
 * Builds the aggregate sub-SQL.
 * Intent: Isolate the inner aggregation select so outer SQL wrappers stay single-purpose.
 * @param {string} calculationMode - The aggregate function name to apply.
 * @param {string} tableName - The source table name.
 * @param {string} valueColumnName - The source value column name.
 * @param {string} sourceWhereSql - The filtered source `where ...` clause.
 * @param {string} timeGroupKeySql - The SQL expression for the grouped time key.
 * @returns {string} The inner aggregate SQL.
 */
export function buildAggregateSubSql(
    calculationMode: string,
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            `${timeGroupKeySql} ${AS_KEYWORD} ${M_TIME_ALIAS}`,
            `${calculationMode}(${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(tableName),
        sourceWhereSql,
        GROUP_BY_M_TIME_CLAUSE,
    );
}

/**
 * Builds the aggregate outer SQL.
 * Intent: Wrap a prepared aggregate sub-SQL without recreating the inner select.
 * @param {string} calculationMode - The aggregate function name to apply to the sub-SQL rows.
 * @param {string} subSql - The prepared inner aggregate SQL.
 * @param {string} outerTimeExpressionSql - The SQL expression used by the outer timestamp projection.
 * @param {number} requestedRowCount - The maximum row count to request.
 * @returns {string} The full aggregate SQL.
 */
export function buildAggregateOuterSql(
    calculationMode: string,
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(outerTimeExpressionSql, TIME_RESULT_ALIAS),
            `${calculationMode}(${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
        ].join(', ')),
        buildSubSqlTargetSqlPart(subSql),
        '',
        GROUP_BY_TIME_RESULT_CLAUSE,
        ORDER_BY_TIME_RESULT_CLAUSE,
        buildLimitSqlPart(requestedRowCount * 1),
    );
}

/**
 * Builds the count outer SQL.
 * Intent: Wrap a prepared count sub-SQL without recreating the inner select.
 * @param {string} subSql - The prepared inner count SQL.
 * @param {string} outerTimeExpressionSql - The SQL expression used by the outer timestamp projection.
 * @param {number} requestedRowCount - The maximum row count to request.
 * @returns {string} The full count SQL.
 */
export function buildCountOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(outerTimeExpressionSql, TIME_COLUMN_NAME),
            `SUM(${M_VALUE_ALIAS}) ${AS_KEYWORD} VALUE`,
        ].join(', ')),
        buildSubSqlTargetSqlPart(subSql),
        '',
        GROUP_BY_TIME_RESULT_CLAUSE,
        ORDER_BY_TIME_RESULT_CLAUSE,
        buildLimitSqlPart(requestedRowCount * 1),
    );
}

/**
 * Builds the average outer SQL.
 * Intent: Wrap a prepared average sub-SQL without recreating the inner select.
 * @param {string} subSql - The prepared inner average SQL.
 * @param {string} outerTimeExpressionSql - The SQL expression used by the outer timestamp projection.
 * @param {number} requestedRowCount - The maximum row count to request.
 * @returns {string} The full average SQL.
 */
export function buildAverageOuterSql(
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(outerTimeExpressionSql, TIME_COLUMN_NAME),
            `SUM(${SUMMVAL_ALIAS}) / SUM(${CNTMVAL_ALIAS}) ${AS_KEYWORD} VALUE`,
        ].join(', ')),
        buildSubSqlTargetSqlPart(subSql),
        '',
        GROUP_BY_TIME_RESULT_CLAUSE,
        ORDER_BY_TIME_RESULT_CLAUSE,
        buildLimitSqlPart(requestedRowCount * 1),
    );
}

/**
 * Builds the average sub-SQL.
 * Intent: Keep the inner sum/count bucket calculation separate from the outer averaging SQL.
 * @param {string} tableName - The source table name.
 * @param {string} valueColumnName - The source value column name.
 * @param {string} sourceWhereSql - The filtered source `where ...` clause.
 * @param {string} timeGroupKeySql - The SQL expression for the grouped time key.
 * @returns {string} The inner average SQL.
 */
export function buildAverageSubSql(
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            `${timeGroupKeySql} ${AS_KEYWORD} ${M_TIME_ALIAS}`,
            `sum(${valueColumnName}) ${AS_KEYWORD} ${SUMMVAL_ALIAS}`,
            `count(${valueColumnName}) ${AS_KEYWORD} ${CNTMVAL_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(tableName),
        sourceWhereSql,
        GROUP_BY_M_TIME_CLAUSE,
    );
}

/**
 * Builds the count sub-SQL.
 * Intent: Isolate the inner count bucket calculation from the outer count wrapper.
 * @param {string} tableName - The source table name.
 * @param {string} valueColumnName - The source value column name.
 * @param {string} sourceWhereSql - The filtered source `where ...` clause.
 * @param {string} timeGroupKeySql - The SQL expression for the grouped time key.
 * @returns {string} The inner count SQL.
 */
export function buildCountSubSql(
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            `${timeGroupKeySql} ${AS_KEYWORD} ${M_TIME_ALIAS}`,
            `count(${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(tableName),
        sourceWhereSql,
        GROUP_BY_M_TIME_CLAUSE,
    );
}

/**
 * Builds the first/last sub-SQL.
 * Intent: Isolate the inner first/last bucket calculation from the outer first/last wrapper.
 * @param {string} calculationMode - The first/last function name to apply.
 * @param {string} tableName - The source table name.
 * @param {string} valueColumnName - The source value column name.
 * @param {string} sourceWhereSql - The filtered source `where ...` clause.
 * @param {string} timeGroupKeySql - The SQL expression for the grouped time key.
 * @returns {string} The inner first/last SQL.
 */
export function buildFirstLastSubSql(
    calculationMode: string,
    tableName: string,
    valueColumnName: string,
    sourceWhereSql: string,
    timeGroupKeySql: string,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            `${timeGroupKeySql} ${AS_KEYWORD} ${M_TIME_ALIAS}`,
            `${calculationMode}(${TIME_COLUMN_NAME}, ${valueColumnName}) ${AS_KEYWORD} ${M_VALUE_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(tableName),
        sourceWhereSql,
        GROUP_BY_M_TIME_CLAUSE,
        ORDER_BY_M_TIME_CLAUSE,
    );
}

/**
 * Builds the first/last outer SQL.
 * Intent: Wrap a prepared first/last sub-SQL without recreating the inner select.
 * @param {string} calculationMode - The first/last function name to apply to the sub-SQL rows.
 * @param {string} subSql - The prepared inner first/last SQL.
 * @param {string} outerTimeExpressionSql - The SQL expression used by the outer timestamp projection.
 * @param {number} requestedRowCount - The maximum row count to request.
 * @returns {string} The full first/last SQL.
 */
export function buildFirstLastOuterSql(
    calculationMode: string,
    subSql: string,
    outerTimeExpressionSql: string,
    requestedRowCount: number,
): string {
    return buildQuerySql(
        buildSelectSqlPart([
            buildOuterTimeResultSql(outerTimeExpressionSql, TIME_RESULT_ALIAS),
            `${calculationMode}(${M_TIME_ALIAS}, ${M_VALUE_ALIAS}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`,
        ].join(', ')),
        buildSubSqlTargetSqlPart(subSql),
        '',
        GROUP_BY_TIME_RESULT_CLAUSE,
        ORDER_BY_TIME_RESULT_CLAUSE,
        buildLimitSqlPart(requestedRowCount * 1),
    );
}
