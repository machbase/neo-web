import { seriesValueSql } from './seriesValueSql';
import {
    jsonValueFieldToNumericSql,
} from '@/utils/dashboardJsonValue';
import { ADMIN_ID } from '@/utils/constants';
import { isStatViewReadable, qualifySiblingObject, qualifyTableName } from '@/utils/qualifiedTableName';
import { buildTagStatExtentSelect } from '@/utils/tagStatColumns';
import {
    buildDateBinTimeExpression,
    buildRollupTimeExpression,
} from '@/utils/rollupQueryBuilder';
import { sqlIdentifier, sqlIdentifierPath, sqlString } from '@/utils/queryText';
import {
    PanelSeriesCalculationMode,
    isNumericBaseTimeSourceColumns,
    type ValidatedPanelSeriesSourceColumns,
} from '../seriesModel';
import {
    getIntervalMs,
    resolveNumericIntervalValue,
    type IntervalOption,
} from '../rangeExpression/intervalResolver';
import type { AxisRange } from '../rangeExpression/rangeModel';
import {
    buildTimeRangeConditionSql,
    indentSql,
    joinSqlLines,
    NANOSECONDS_PER_MILLISECOND,
    toQueryTimeLiteralSql,
    toQueryResultMillisecondsSql,
} from './sql';

export type RollupMode = 'standard' | 'base-json';

export const RAW_SERIES_ROW_LIMIT = 20000;

export function buildCalculatedSeriesSql(
    tableName: string,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    timeRange: AxisRange,
    calculationMode: PanelSeriesCalculationMode,
    interval: IntervalOption,
    rowLimit: number,
    rollupMode?: RollupMode,
    numericBucketWidth?: number,
): string {
    const usesNumericTime: boolean = isNumericBaseTimeSourceColumns(columns);
    const timeColumnSql: string = sqlIdentifier(columns.time);
    let bucketTimeSql: string;

    if (rollupMode !== undefined) {
        bucketTimeSql = buildRollupTimeExpression(
            timeColumnSql,
            interval.IntervalType,
            interval.IntervalValue,
        );
    } else if (usesNumericTime) {
        const startTime: number = timeRange.start;
        const bucketSize: number = numericBucketWidth ??
            resolveNumericIntervalValue(
                timeRange.end - startTime,
                rowLimit,
            );
        bucketTimeSql = timeColumnSql;
        if (bucketSize > 0) {
            bucketTimeSql = `TRUNC((${timeColumnSql} - ${startTime}) / ${bucketSize}, 0) * ${bucketSize} + ${startTime}`;
        }
    } else {
        bucketTimeSql = buildDateBinTimeExpression(
            timeColumnSql,
            interval.IntervalType,
            interval.IntervalValue,
        );
    }

    const sourceValueSql: string = rollupMode === 'base-json'
        ? sqlIdentifier(columns.value)
        : seriesValueSql(columns, calculationMode);
    const outputTimeSql: string = usesNumericTime
        ? 'mTime'
        : toQueryResultMillisecondsSql('mTime');
    let aggregateSql: string;

    switch (calculationMode) {
        case PanelSeriesCalculationMode.Average:
            aggregateSql = joinSqlLines([
                `SUM(${sourceValueSql}) AS mSum,`,
                `COUNT(${sourceValueSql}) AS mCount`,
            ]);
            break;
        case PanelSeriesCalculationMode.Count:
            aggregateSql = `COUNT(${sourceValueSql}) AS mValue`;
            break;
        case PanelSeriesCalculationMode.First:
        case PanelSeriesCalculationMode.Last:
            aggregateSql = `${calculationMode}(${timeColumnSql}, ${sourceValueSql}) AS mValue`;
            break;
        default:
            aggregateSql = `${calculationMode}(${sourceValueSql}) AS mValue`;
    }

    let resultValueSql: string = 'mValue';
    let resultFilterSql: string = '';
    if (calculationMode === PanelSeriesCalculationMode.Average) {
        const summedValueSql: string = rollupMode === 'base-json'
            ? jsonValueFieldToNumericSql('mSum', columns.jsonKey)
            : 'mSum';
        resultValueSql = `${summedValueSql} / mCount`;
        resultFilterSql = 'WHERE mCount > 0';
    } else if (
        rollupMode === 'base-json' &&
        calculationMode !== PanelSeriesCalculationMode.Count
    ) {
        resultValueSql = jsonValueFieldToNumericSql(
            'mValue',
            columns.jsonKey,
        );
    }

    const groupedQuerySql: string = joinSqlLines([
        `SELECT ${bucketTimeSql} AS mTime,`,
        indentSql(aggregateSql),
        `FROM ${sqlIdentifierPath(tableName)}`,
        `WHERE ${sqlIdentifier(columns.name)} = ${sqlString(tagName)}`,
        `  AND ${buildTimeRangeConditionSql(
            timeColumnSql,
            timeRange,
            usesNumericTime,
        )}`,
        'GROUP BY mTime',
    ]);

    return joinSqlLines([
        `SELECT ${outputTimeSql},`,
        `    ${resultValueSql}`,
        'FROM (',
        indentSql(groupedQuerySql),
        ')',
        resultFilterSql,
        'ORDER BY mTime',
        `LIMIT ${rowLimit + 1}`,
    ]);
}

export function buildCalculatedSeriesBoundaryBucketSql(
    tableName: string,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    boundaryTime: number,
    direction: 'before' | 'after',
    interval: IntervalOption,
): string {
    const timeColumnSql: string = sqlIdentifier(columns.time);
    const bucketTimeSql: string = buildDateBinTimeExpression(
        timeColumnSql,
        interval.IntervalType,
        interval.IntervalValue,
    );
    // Keep locator and aggregate bucket origins identical on the DB server.
    const alignedBoundarySql: string = buildDateBinTimeExpression(
        toQueryTimeLiteralSql(boundaryTime, false),
        interval.IntervalType,
        interval.IntervalValue,
    );
    const intervalMs: number = getIntervalMs(
        interval.IntervalType,
        interval.IntervalValue,
    );
    const intervalNanoseconds: bigint =
        BigInt(intervalMs) * BigInt(NANOSECONDS_PER_MILLISECOND);
    const hintTableName: string = sqlIdentifier(tableName.slice(
        tableName.lastIndexOf('.') + 1,
    ));
    const isBefore: boolean = direction === 'before';
    // The bucket containing the right endpoint is already part of the main query.
    const boundarySql: string = isBefore
        ? alignedBoundarySql
        : `${alignedBoundarySql} + ${intervalNanoseconds}`;

    return joinSqlLines([
        `SELECT /*+ ${isBefore ? 'SCAN_BACKWARD' : 'SCAN_FORWARD'}(${hintTableName}) */ ${toQueryResultMillisecondsSql(bucketTimeSql)} AS mTime`,
        `FROM ${sqlIdentifierPath(tableName)}`,
        `WHERE ${sqlIdentifier(columns.name)} = ${sqlString(tagName)}`,
        `  AND ${timeColumnSql} ${isBefore ? '<' : '>='} ${boundarySql}`,
        'LIMIT 1',
    ]);
}

export function buildRawSeriesSql(
    tableName: string,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    timeRange: AxisRange,
    useOrderBy: boolean,
    sampleCount?: number,
): string {
    const context: RawSeriesSqlContext = createRawSeriesSqlContext(
        tableName,
        tagName,
        columns,
        timeRange,
        useOrderBy,
    );
    const samplingHint: string = sampleCount === undefined
        ? ''
        : `SAMPLING(${sampleCount}) `;
    const inRangeQuerySql: string = joinSqlLines([
        `SELECT /*+ ${samplingHint}SCAN_FORWARD(${context.hintTableName}) */ ${context.selectBodySql}`,
        `  AND ${buildTimeRangeConditionSql(
            sqlIdentifier(columns.time),
            timeRange,
            context.usesNumericTime,
        )}`,
        context.forwardOrderBySql,
    ]);
    const insideQuerySql: string = sampleCount === undefined
        ? joinSqlLines([
              inRangeQuerySql,
              `LIMIT ${RAW_SERIES_ROW_LIMIT + 1}`,
          ])
        : joinSqlLines([
              'SELECT *',
              'FROM (',
              indentSql(inRangeQuerySql),
              ')',
              `LIMIT ${RAW_SERIES_ROW_LIMIT + 1}`,
          ]);

    return [
        context.beforeQuerySql,
        insideQuerySql,
        context.afterQuerySql,
    ].join('\nUNION ALL\n');
}

export type SeriesFullRangeSqlQueries =
    | [rangeSql: string]
    | [startSql: string, endSql: string];

/**
 * Can this series' extent come from `V$<TABLE>_STAT` rather than a scan?
 *
 * Two independent conditions, and both were once written as something narrower:
 *
 *  - **The database.** The test used to be `isMountedTableName`, because a mounted backup was the
 *    only database known to lack the view. Measured on a v8.7 server from a MACHBASEDB session, a
 *    three-part name does not reach the view in *any* other database: an ordinary active
 *    `FACTORY_A.SYS.V$DEMO_TAG_STAT` answers `MACHCLI-ERR-3031, Protocol error` even though
 *    `V$TABLES` lists the view in FACTORY_A, and the mounted one answers `ERR-2025`. So the
 *    question is whether the table is in the session's own database — `isStatViewReadable` — and
 *    the mounted case falls out of it. Getting this wrong is not a slow query but a thrown error:
 *    the panel never resolves a range and does not open.
 *
 *  - **The time column.** The view describes the table's BASETIME column, so only the conventional
 *    datetime `TIME` column can be read through it. Numeric BASE DISTANCE ranges always read the
 *    source table: older engines do not expose MIN_DISTANCE / MAX_DISTANCE, and probing for those
 *    columns produces an avoidable failed request before the fallback succeeds.
 *
 * Worth keeping the fast path for where it does apply — measured on a 54k-row tag table, the view
 * answers in 0.9 ms against 10.2 ms for the scan, and the gap widens with row count.
 */
export function usesTagStatViewForFullRange(
    tableName: string,
    columns: ValidatedPanelSeriesSourceColumns,
): boolean {
    if (!isStatViewReadable(tableName)) return false;
    return !isNumericBaseTimeSourceColumns(columns) &&
        columns.time.toUpperCase() === 'TIME';
}

/**
 * The SQL for a series' full data extent.
 *
 * `forceSourceTable` gives the caller the scanning form of the same question when a statistics-view
 * request fails. Numeric BASE DISTANCE ranges already use that form directly.
 */
export function buildSeriesFullRangeSql(
    tableName: string,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    options: { forceSourceTable?: boolean } = {},
): SeriesFullRangeSqlQueries {
    const usesNumericTime: boolean = isNumericBaseTimeSourceColumns(columns);
    const usesSourceTable: boolean =
        Boolean(options.forceSourceTable) ||
        !usesTagStatViewForFullRange(tableName, columns);
    let targetTableName: string;
    if (usesSourceTable) {
        targetTableName = qualifyTableName(ADMIN_ID, tableName);
    } else {
        // Decorate the last segment only. Reading `parts[0]` as the owner gave the *database*
        // on a three-part name — `FACTORY_A.V$ATABLE_STAT`, which the engine rejects with
        // `ERR-2080, User (FACTORY_A) does not exist`.
        targetTableName = qualifySiblingObject(ADMIN_ID.toUpperCase(), tableName, (aName) => {
            const sMatch = aName.match(/^V\$(.*)_STAT$/i);
            return `V$${sMatch ? sMatch[1] : aName}_STAT`;
        });
    }
    const queryTableName: string = sqlIdentifierPath(targetTableName);
    const tagNameSql: string = sqlString(tagName);

    if (!usesSourceTable) {
        // Aggregated: the view answers one row per tag, and on a cluster one row per warehouse per
        // tag, so the extent is the aggregate over whatever it returns — always a single row here.
        return [joinSqlLines([
            `SELECT ${buildTagStatExtentSelect('time', 'min_tm', 'max_tm')}`,
            `FROM ${queryTableName}`,
            `WHERE NAME IN (${tagNameSql})`,
        ])];
    }

    const timeColumn: string = sqlIdentifier(columns.time);
    const tagColumn: string = sqlIdentifier(columns.name);
    if (usesNumericTime) {
        return [
            buildSeriesBoundarySql(
                queryTableName,
                timeColumn,
                tagColumn,
                tagNameSql,
                'ASC',
            ),
            buildSeriesBoundarySql(
                queryTableName,
                timeColumn,
                tagColumn,
                tagNameSql,
                'DESC',
            ),
        ];
    }

    return [joinSqlLines([
        `SELECT MIN(${timeColumn}) AS min_tm,`,
        `       MAX(${timeColumn}) AS max_tm`,
        `FROM ${queryTableName}`,
        `WHERE ${tagColumn} = ${tagNameSql}`,
        `  AND ${timeColumn} IS NOT NULL`,
    ])];
}

// -------------------- Local --------------------

type RawSeriesSqlContext = {
    usesNumericTime: boolean;
    selectBodySql: string;
    hintTableName: string;
    forwardOrderBySql: string;
    beforeQuerySql: string;
    afterQuerySql: string;
};

function createRawSeriesSqlContext(
    tableName: string,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    timeRange: AxisRange,
    useOrderBy: boolean,
): RawSeriesSqlContext {
    const usesNumericTime: boolean =
        isNumericBaseTimeSourceColumns(columns);
    const timeColumnSql: string = sqlIdentifier(columns.time);
    const outputTimeSql: string = usesNumericTime
        ? timeColumnSql
        : toQueryResultMillisecondsSql(timeColumnSql);
    const outputValueSql: string = seriesValueSql(columns);
    const hintTableName: string = sqlIdentifier(tableName.slice(tableName.lastIndexOf('.') + 1));
    const selectBodySql: string = joinSqlLines([
        `${outputTimeSql} AS mTime,`,
        `    ${outputValueSql} AS mValue`,
        `FROM ${sqlIdentifierPath(tableName)}`,
        `WHERE ${sqlIdentifier(columns.name)} = ${sqlString(tagName)}`,
    ]);
    const startTimeSql: string = toQueryTimeLiteralSql(
        timeRange.start,
        usesNumericTime,
    );
    const endTimeSql: string = toQueryTimeLiteralSql(
        timeRange.end,
        usesNumericTime,
    );
    const forwardOrderBySql: string = useOrderBy ? 'ORDER BY mTime ASC' : '';

    return {
        usesNumericTime,
        selectBodySql,
        hintTableName,
        forwardOrderBySql,
        beforeQuerySql: joinSqlLines([
            `SELECT /*+ SCAN_BACKWARD(${hintTableName}) */ ${selectBodySql}`,
            `  AND ${timeColumnSql} < ${startTimeSql}`,
            'LIMIT 1',
        ]),
        afterQuerySql: joinSqlLines([
            `SELECT /*+ SCAN_FORWARD(${hintTableName}) */ ${selectBodySql}`,
            `  AND ${timeColumnSql} > ${endTimeSql}`,
            'LIMIT 1',
        ]),
    };
}

function buildSeriesBoundarySql(
    tableName: string,
    timeColumn: string,
    tagColumn: string,
    tagNameSql: string,
    sortDirection: 'ASC' | 'DESC',
): string {
    return joinSqlLines([
        `SELECT ${timeColumn} AS boundary`,
        `FROM ${tableName}`,
        `WHERE ${tagColumn} = ${tagNameSql}`,
        `  AND ${timeColumn} IS NOT NULL`,
        `ORDER BY ${timeColumn} ${sortDirection}`,
        'LIMIT 1',
    ]);
}
