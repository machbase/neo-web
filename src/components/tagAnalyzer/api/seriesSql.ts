import {
    jsonValueFieldToNumericSql,
    toSqlValueExpressionForAggregator,
} from '@/utils/dashboardJsonValue';
import { ADMIN_ID } from '@/utils/constants';
import { isStatViewReadable, qualifySiblingObject, qualifyTableName } from '@/utils/qualifiedTableName';
import { buildTagStatExtentSelect } from '@/utils/tagStatColumns';
import {
    buildDateBinTimeExpression,
    buildRollupTimeExpression,
} from '@/utils/rollupQueryBuilder';
import {
    PanelSeriesCalculationMode,
    isNumericBaseTimeSourceColumns,
    parseSqlIdentifierPath,
    type SqlIdentifierPath,
    type ValidatedPanelSeriesSourceColumns,
} from '../seriesModel';
import {
    getIntervalMs,
    resolveNumericIntervalValue,
    type IntervalOption,
} from '../range/intervalResolver';
import type { AxisRange } from '../range/rangeModel';
import {
    buildSqlStringLiteral,
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
    tableName: SqlIdentifierPath,
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
    let bucketTimeSql: string;

    if (rollupMode !== undefined) {
        bucketTimeSql = buildRollupTimeExpression(
            columns.time,
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
        bucketTimeSql = columns.time;
        if (bucketSize > 0) {
            bucketTimeSql = `TRUNC((${columns.time} - ${startTime}) / ${bucketSize}, 0) * ${bucketSize} + ${startTime}`;
        }
    } else {
        bucketTimeSql = buildDateBinTimeExpression(
            columns.time,
            interval.IntervalType,
            interval.IntervalValue,
        );
    }

    const sourceValueSql: string = rollupMode === 'base-json'
        ? columns.value
        : toSqlValueExpressionForAggregator(
              columns.value,
              calculationMode,
              columns.jsonKey,
          );
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
            aggregateSql = `${calculationMode}(${columns.time}, ${sourceValueSql}) AS mValue`;
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
        `FROM ${tableName}`,
        `WHERE ${columns.name} = ${buildSqlStringLiteral(tagName)}`,
        `  AND ${buildTimeRangeConditionSql(
            columns.time,
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
    tableName: SqlIdentifierPath,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    boundaryTime: number,
    direction: 'before' | 'after',
    interval: IntervalOption,
): string {
    const bucketTimeSql: string = buildDateBinTimeExpression(
        columns.time,
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
    const hintTableName: string = tableName.slice(
        tableName.lastIndexOf('.') + 1,
    );
    const isBefore: boolean = direction === 'before';
    // The bucket containing the right endpoint is already part of the main query.
    const boundarySql: string = isBefore
        ? alignedBoundarySql
        : `${alignedBoundarySql} + ${intervalNanoseconds}`;

    return joinSqlLines([
        `SELECT /*+ ${isBefore ? 'SCAN_BACKWARD' : 'SCAN_FORWARD'}(${hintTableName}) */ ${toQueryResultMillisecondsSql(bucketTimeSql)} AS mTime`,
        `FROM ${tableName}`,
        `WHERE ${columns.name} = ${buildSqlStringLiteral(tagName)}`,
        `  AND ${columns.time} ${isBefore ? '<' : '>='} ${boundarySql}`,
        'LIMIT 1',
    ]);
}

type RawSeriesSqlContext = {
    usesNumericTime: boolean;
    selectBodySql: string;
    hintTableName: string;
    forwardOrderBySql: string;
    beforeQuerySql: string;
    afterQuerySql: string;
};

function createRawSeriesSqlContext(
    tableName: SqlIdentifierPath,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    timeRange: AxisRange,
    useOrderBy: boolean,
): RawSeriesSqlContext {
    const usesNumericTime: boolean =
        isNumericBaseTimeSourceColumns(columns);
    const outputTimeSql: string = usesNumericTime
        ? columns.time
        : toQueryResultMillisecondsSql(columns.time);
    const outputValueSql: string = jsonValueFieldToNumericSql(
        columns.value,
        columns.jsonKey,
    );
    const hintTableName: string = tableName.slice(tableName.lastIndexOf('.') + 1);
    const selectBodySql: string = joinSqlLines([
        `${outputTimeSql} AS mTime,`,
        `    ${outputValueSql} AS mValue`,
        `FROM ${tableName}`,
        `WHERE ${columns.name} = ${buildSqlStringLiteral(tagName)}`,
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
            `  AND ${columns.time} < ${startTimeSql}`,
            'LIMIT 1',
        ]),
        afterQuerySql: joinSqlLines([
            `SELECT /*+ SCAN_FORWARD(${hintTableName}) */ ${selectBodySql}`,
            `  AND ${columns.time} > ${endTimeSql}`,
            'LIMIT 1',
        ]),
    };
}

export function buildRawSeriesSql(
    tableName: SqlIdentifierPath,
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
            columns.time,
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
 *  - **The time column.** The view describes the table's BASETIME column, so a datetime base that
 *    the table calls something other than `TIME` cannot be read through it. A numeric (distance)
 *    base is exempt: the view publishes MIN_DISTANCE / MAX_DISTANCE for it whatever the column is
 *    named, since a table has exactly one BASE DISTANCE column to describe.
 *
 * Worth keeping the fast path for where it does apply — measured on a 54k-row tag table, the view
 * answers in 0.9 ms against 10.2 ms for the scan, and the gap widens with row count.
 */
export function usesTagStatViewForFullRange(
    tableName: string,
    columns: ValidatedPanelSeriesSourceColumns,
): boolean {
    if (!isStatViewReadable(tableName)) return false;
    return isNumericBaseTimeSourceColumns(columns) ||
        columns.time.toUpperCase() === 'TIME';
}

/**
 * The SQL for a series' full data extent.
 *
 * `forceSourceTable` gives the caller the scanning form of the same question, for the one case the
 * statistics view can fail on a server that otherwise answers it: an engine older than the base
 * distance stat columns rejects MIN_DISTANCE with `MACHCLI-ERR-2056`. See `fetchSingleSeriesRange`.
 */
export function buildSeriesFullRangeSql(
    tableName: SqlIdentifierPath,
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
    const queryTableName: SqlIdentifierPath = parseSqlIdentifierPath(
        targetTableName,
        'SQL table name',
    );
    const tagNameSql: string = buildSqlStringLiteral(tagName);

    if (!usesSourceTable) {
        // Aggregated: the view answers one row per tag, and on a cluster one row per warehouse per
        // tag, so the extent is the aggregate over whatever it returns — always a single row here.
        return [joinSqlLines([
            `SELECT ${buildTagStatExtentSelect(usesNumericTime ? 'distance' : 'time', 'min_tm', 'max_tm')}`,
            `FROM ${queryTableName}`,
            `WHERE NAME IN (${tagNameSql})`,
        ])];
    }

    const timeColumn: SqlIdentifierPath = columns.time;
    const tagColumn: SqlIdentifierPath = columns.name;
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

function buildSeriesBoundarySql(
    tableName: SqlIdentifierPath,
    timeColumn: SqlIdentifierPath,
    tagColumn: SqlIdentifierPath,
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
