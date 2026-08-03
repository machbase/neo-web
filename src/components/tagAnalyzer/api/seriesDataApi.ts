import { ADMIN_ID } from '@/utils/constants';
import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import { parseFiniteNumber } from '../objectGuards';
import {
    findRollupTableEntry,
    hasMixedXAxisValueKinds,
    isNumericBaseTimeSourceColumns,
    parseSqlIdentifierPath,
    PanelSeriesCalculationMode,
    validatePanelSeriesSourceColumns,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
    type RollupDefinition,
    type RollupTableEntry,
    type RollupTableMap,
    type SqlIdentifierPath,
    type ValidatedPanelSeriesSourceColumns,
} from '../seriesModel';
import {
    getIntervalMs,
    type IntervalOption,
} from '../range/intervalResolver';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import type { AxisRange } from '../range/rangeModel';
import { getEnclosingRange } from '../range/rangeArithmetic';
import {
    getUnknownErrorMessage,
    parseQueryResponse,
    requestSqlQuery,
    type QueryResponse,
} from './machbaseClient';
import { NANOSECONDS_PER_MILLISECOND } from './sql';
import {
    buildCalculatedSeriesBoundaryBucketSql,
    buildCalculatedSeriesSql,
    buildRawSeriesSql,
    buildSeriesFullRangeSql,
    RAW_SERIES_ROW_LIMIT,
    type SeriesFullRangeSqlQueries,
    type RollupMode,
} from './seriesSql';

type SeriesDataRow = [timestamp: number, value: number | null];

const MALFORMED_CHART_DATA_MESSAGE: string =
    'Chart data response contained malformed rows.';
const CHART_DATA_REQUEST_FAILED_MESSAGE: string =
    'Chart data request failed.';
const inFlightChartSqlRequests: Map<string, Promise<SeriesDataRow[]>> =
    new Map();

function parseChartQueryResponse(apiResponse: unknown): SeriesDataRow[] {
    const response: QueryResponse = parseQueryResponse(
        apiResponse,
        CHART_DATA_REQUEST_FAILED_MESSAGE,
        MALFORMED_CHART_DATA_MESSAGE,
    );

    return response.rows.map((row): SeriesDataRow => {
        if (!Array.isArray(row) || row.length < 2) {
            throw new Error(MALFORMED_CHART_DATA_MESSAGE);
        }

        const timestamp: number | undefined = parseFiniteNumber(row[0]);
        const rawValue: unknown = row[1];
        const value: number | null | undefined =
            rawValue === null ||
            (
                typeof rawValue === 'string' &&
                rawValue.trim().toUpperCase() === 'NULL'
            )
                ? null
                : parseFiniteNumber(rawValue);
        if (timestamp === undefined || value === undefined) {
            throw new Error(MALFORMED_CHART_DATA_MESSAGE);
        }

        return [timestamp, value];
    });
}

async function fetchChartRows(
    querySql: string,
    signal?: AbortSignal,
): Promise<SeriesDataRow[]> {
    if (signal) {
        const rows: SeriesDataRow[] = await requestSqlQuery(querySql, signal)
            .then(parseChartQueryResponse);

        return cloneChartFetchRows(rows);
    }

    const existingRequest: Promise<SeriesDataRow[]> | undefined =
        inFlightChartSqlRequests.get(querySql);
    if (existingRequest) {
        return cloneChartFetchRows(await existingRequest);
    }

    const chartRowsRequest: Promise<SeriesDataRow[]> =
        requestSqlQuery(querySql).then(parseChartQueryResponse);

    inFlightChartSqlRequests.set(querySql, chartRowsRequest);

    try {
        return cloneChartFetchRows(await chartRowsRequest);
    } finally {
        if (inFlightChartSqlRequests.get(querySql) === chartRowsRequest) {
            inFlightChartSqlRequests.delete(querySql);
        }
    }
}

function cloneChartFetchRows(rows: SeriesDataRow[]): SeriesDataRow[] {
    return rows.map((row) => [...row] as SeriesDataRow);
}

async function fetchChartTimestamps(
    querySql: string,
    signal?: AbortSignal,
): Promise<number[]> {
    const response: QueryResponse = parseQueryResponse(
        await requestSqlQuery(querySql, signal),
        CHART_DATA_REQUEST_FAILED_MESSAGE,
        MALFORMED_CHART_DATA_MESSAGE,
    );

    return response.rows.map((row): number => {
        if (!Array.isArray(row) || row.length < 1) {
            throw new Error(MALFORMED_CHART_DATA_MESSAGE);
        }

        const timestamp: number | undefined = parseFiniteNumber(row[0]);
        if (timestamp === undefined) {
            throw new Error(MALFORMED_CHART_DATA_MESSAGE);
        }

        return timestamp;
    });
}

type PanelSeriesFetchResult = {
    seriesKey: string;
    data: SeriesDataRow[];
    metadata?:
        | {
              kind: 'calculated';
              isLimitReached: boolean;
              usesRollup: boolean;
          }
        | {
              kind: 'raw';
              isLimitReached: boolean;
          };
    error?: {
        kind: 'no-data' | 'request-failed';
        message: string;
    };
};

export type PanelDataFetchResult = PanelSeriesFetchResult[];

const DATA_DOES_NOT_EXIST_PREFIX: string = 'Data does not exist';

type CalculatedSeriesFetchOptions = {
    numericBucketWidth?: number;
    signal?: AbortSignal;
};

async function fetchCalculatedSeriesRows(
    seriesList: PanelSeriesDefinition[],
    timeRange: AxisRange,
    interval: IntervalOption,
    rowLimit: number,
    rollupTables: RollupTableMap,
    options?: CalculatedSeriesFetchOptions,
): Promise<PanelDataFetchResult | undefined> {
    return fetchPanelSeriesRows(
        seriesList,
        options?.signal,
        (series) =>
            fetchCalculatedSeriesData(
                series,
                timeRange,
                interval,
                rowLimit,
                rollupTables,
                options,
            ),
    );
}

function fetchRawSeriesRows(
    seriesList: PanelSeriesDefinition[],
    timeRange: AxisRange,
    useOrderBy: boolean,
    signal?: AbortSignal,
): Promise<PanelDataFetchResult | undefined> {
    return fetchRawSeriesRowsByQuery(
        seriesList,
        timeRange,
        useOrderBy,
        { kind: 'raw' },
        signal,
    );
}

function fetchSampledRawSeriesRows(
    seriesList: PanelSeriesDefinition[],
    timeRange: AxisRange,
    sampleCount: number,
    useOrderBy: boolean,
    signal?: AbortSignal,
): Promise<PanelDataFetchResult | undefined> {
    return fetchRawSeriesRowsByQuery(
        seriesList,
        timeRange,
        useOrderBy,
        { kind: 'sampled', sampleCount },
        signal,
    );
}

async function fetchRawSeriesRowsByQuery(
    seriesList: PanelSeriesDefinition[],
    timeRange: AxisRange,
    useOrderBy: boolean,
    query: { kind: 'raw' } | { kind: 'sampled'; sampleCount: number },
    signal?: AbortSignal,
): Promise<PanelDataFetchResult | undefined> {
    return fetchPanelSeriesRows(
        seriesList,
        signal,
        async (series) => {
            const tableName: SqlIdentifierPath = parseSqlIdentifierPath(
                addAdminSchemaIfNeeded(series.table),
                'SQL table name',
            );
            const columns: ValidatedPanelSeriesSourceColumns =
                validatePanelSeriesSourceColumns(series.sourceColumns);
            const querySql: string = buildRawSeriesSql(
                tableName,
                series.sourceTagName,
                columns,
                timeRange,
                useOrderBy,
                query.kind === 'sampled' ? query.sampleCount : undefined,
            );
            const rows: SeriesDataRow[] = await fetchChartRows(querySql, signal);
            const beforeRows: SeriesDataRow[] = [];
            const insideRows: SeriesDataRow[] = [];
            const afterRows: SeriesDataRow[] = [];
            for (const row of rows) {
                if (row[0] < timeRange.start) {
                    beforeRows.push(row);
                } else if (row[0] <= timeRange.end) {
                    insideRows.push(row);
                } else {
                    afterRows.push(row);
                }
            }
            const isLimitReached: boolean =
                insideRows.length > RAW_SERIES_ROW_LIMIT;

            return {
                seriesKey: series.key,
                data: isLimitReached
                    ? insideRows.slice(0, RAW_SERIES_ROW_LIMIT)
                    : [...beforeRows, ...insideRows, ...afterRows],
                metadata: {
                    kind: 'raw',
                    isLimitReached,
                },
            };
        },
    );
}

async function fetchPanelSeriesRows(
    seriesList: PanelSeriesDefinition[],
    signal: AbortSignal | undefined,
    fetchSeries: (series: PanelSeriesDefinition) => Promise<PanelSeriesFetchResult>,
): Promise<PanelDataFetchResult | undefined> {
    if (seriesList.length === 0) return undefined;

    return Promise.all(
        seriesList.map(async (series) => {
            try {
                return await fetchSeries(series);
            } catch (error) {
                if (signal?.aborted) throw error;
                return createPanelSeriesErrorResult(series.key, error);
            }
        }),
    );
}

function createPanelSeriesErrorResult(
    seriesKey: string,
    error: unknown,
): PanelSeriesFetchResult {
    const message: string = getUnknownErrorMessage(
        error,
        'Series data request failed.',
    );

    return {
        seriesKey,
        data: [],
        error: {
            kind: message.trim().startsWith(DATA_DOES_NOT_EXIST_PREFIX)
                ? 'no-data'
                : 'request-failed',
            message,
        },
    };
}

async function fetchCalculatedSeriesData(
    series: PanelSeriesDefinition,
    timeRange: AxisRange,
    interval: IntervalOption,
    rowLimit: number,
    rollupTables: RollupTableMap,
    options?: CalculatedSeriesFetchOptions,
): Promise<PanelSeriesFetchResult> {
    const columns: ValidatedPanelSeriesSourceColumns =
        validatePanelSeriesSourceColumns(series.sourceColumns);
    const tableName: SqlIdentifierPath = parseSqlIdentifierPath(
        addAdminSchemaIfNeeded(series.table),
        'SQL table name',
    );
    const rollupMode: RollupMode | undefined =
        options?.numericBucketWidth === undefined
            ? resolveCalculatedRollupMode(
                  series,
                  columns,
                  interval,
                  rollupTables,
              )
            : undefined;
    const rows: SeriesDataRow[] = await fetchChartRows(
        buildCalculatedSeriesSql(
            tableName,
            series.sourceTagName,
            columns,
            timeRange,
            series.calculationMode,
            interval,
            rowLimit,
            rollupMode,
            options?.numericBucketWidth,
        ),
        options?.signal,
    );
    const usesRollup: boolean = rollupMode !== undefined;
    const usesBoundedNumericBuckets: boolean =
        !usesRollup && isNumericBaseTimeSourceColumns(columns);
    const isLimitReached: boolean =
        !usesBoundedNumericBuckets && rows.length > rowLimit;
    const data: SeriesDataRow[] = isLimitReached
        ? rows.slice(0, rowLimit)
        : mergeSeriesRows(
              rows,
              await fetchCalculatedSeriesEdgeRows(
                  series,
                  tableName,
                  columns,
                  timeRange,
                  interval,
                  rollupMode,
                  options?.signal,
              ),
          );

    return {
        seriesKey: series.key,
        data,
        metadata: {
            kind: 'calculated',
            isLimitReached,
            usesRollup,
        },
    };
}

async function fetchCalculatedSeriesEdgeRows(
    series: PanelSeriesDefinition,
    tableName: SqlIdentifierPath,
    columns: ValidatedPanelSeriesSourceColumns,
    timeRange: AxisRange,
    interval: IntervalOption,
    rollupMode: RollupMode | undefined,
    signal?: AbortSignal,
): Promise<SeriesDataRow[]> {
    if (
        columns.timeBaseTime !== true ||
        isNumericBaseTimeSourceColumns(columns)
    ) {
        return [];
    }

    const intervalMs: number = getIntervalMs(
        interval.IntervalType,
        interval.IntervalValue,
    );
    if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) return [];

    const locatorSql: string = [
        buildCalculatedSeriesBoundaryBucketSql(
            tableName,
            series.sourceTagName,
            columns,
            timeRange.start,
            'before',
            interval,
        ),
        buildCalculatedSeriesBoundaryBucketSql(
            tableName,
            series.sourceTagName,
            columns,
            timeRange.end,
            'after',
            interval,
        ),
    ].join('\nUNION ALL\n');
    const edgeRanges: AxisRange[] = (
        await fetchChartTimestamps(locatorSql, signal)
    )
        .map((startTime) => ({
            start: startTime,
            end: startTime + intervalMs,
        }))
        .filter(
            (range, index, ranges) =>
                ranges.findIndex(
                    (candidate) => candidate.start === range.start,
                ) === index,
        );
    if (edgeRanges.length === 0) return [];

    const edgeSql: string = edgeRanges
        .map((edgeRange) =>
            buildCalculatedSeriesSql(
                tableName,
                series.sourceTagName,
                columns,
                edgeRange,
                series.calculationMode,
                interval,
                2,
                rollupMode,
            ),
        )
        .join('\nUNION ALL\n');
    const edgeRows: SeriesDataRow[] = await fetchChartRows(edgeSql, signal);

    // BETWEEN can also return the bucket at an edge range's inclusive end.
    return edgeRows.filter(([timestamp]) =>
        edgeRanges.some(
            (range) =>
                timestamp >= range.start &&
                timestamp < range.end,
        ),
    );
}

function mergeSeriesRows(
    rows: SeriesDataRow[],
    edgeRows: SeriesDataRow[],
): SeriesDataRow[] {
    const rowsByTimestamp: Map<number, SeriesDataRow> = new Map();

    for (const row of edgeRows) rowsByTimestamp.set(row[0], row);
    for (const row of rows) rowsByTimestamp.set(row[0], row);

    return [...rowsByTimestamp.values()].sort((left, right) =>
        left[0] - right[0],
    );
}

function resolveCalculatedRollupMode(
    series: PanelSeriesDefinition,
    columns: ValidatedPanelSeriesSourceColumns,
    interval: IntervalOption,
    rollupTables: RollupTableMap,
): RollupMode | undefined {
    if (columns.timeBaseTime !== true) {
        return undefined;
    }

    const intervalMs: number = getIntervalMs(
        interval.IntervalType,
        interval.IntervalValue,
    );
    const tableRollups: RollupTableEntry | undefined =
        findRollupTableEntry(rollupTables, series.table);
    if (!tableRollups || intervalMs <= 0) {
        return undefined;
    }

    const requiresFirstLastSupport: boolean =
        series.calculationMode === PanelSeriesCalculationMode.First ||
        series.calculationMode === PanelSeriesCalculationMode.Last;
    for (const columnName of getRollupColumnNameCandidates(
        columns.value,
        columns.jsonKey,
    )) {
        const match: RollupDefinition | undefined =
            tableRollups[columnName]?.find(
                ({ intervalMs: rollupIntervalMs }) =>
                    intervalMs % rollupIntervalMs === 0,
            );
        if (!match) continue;

        if (requiresFirstLastSupport && !match.supportsFirstLast) {
            return undefined;
        }

        return columns.jsonKey && columnName === columns.value
            ? 'base-json'
            : 'standard';
    }

    return undefined;
}

function addAdminSchemaIfNeeded(
    tableName: string,
): string {
    return tableName.includes('.')
        ? tableName
        : `${ADMIN_ID.toUpperCase()}.${tableName}`;
}

const RANGE_REQUEST_FAILED_MESSAGE: string =
    'Series full-range request failed.';
const MALFORMED_RANGE_MESSAGE: string =
    'Series full-range response contained malformed rows.';

type SeriesFullRangeSource = {
    table: string;
    sourceTagName: string;
    sourceColumns: PanelSeriesSourceColumns;
};

async function fetchSeriesFullRange(
    seriesList: SeriesFullRangeSource[],
    onSeriesError?: (message: string) => void,
): Promise<AxisRange> {
    if (seriesList.length === 0) {
        throw new Error('Cannot resolve a full range without any series.');
    }
    if (hasMixedXAxisValueKinds(seriesList)) {
        throw new Error(
            'Numeric basetime and datetime series cannot be mixed in one panel.',
        );
    }

    const errors: string[] = [];
    const reportSeriesError = (series: SeriesFullRangeSource, error: unknown) => {
        const message: string = getSeriesFullRangeErrorMessage(series, error);
        errors.push(message);
        onSeriesError?.(message);
        return undefined;
    };
    const rangeRequests: Map<string, Promise<AxisRange | undefined>> =
        new Map();
    for (const series of seriesList) {
        try {
            if (!series.table.trim()) {
                throw new Error('Series table is missing.');
            }
            if (!series.sourceTagName.trim()) {
                throw new Error('Series tag is missing.');
            }

            const tableName: SqlIdentifierPath = parseSqlIdentifierPath(
                series.table,
                'SQL table name',
            );
            const columns: ValidatedPanelSeriesSourceColumns =
                validatePanelSeriesSourceColumns(series.sourceColumns);
            const usesNumericTime: boolean =
                isNumericBaseTimeSourceColumns(columns);
            const sqlQueries: SeriesFullRangeSqlQueries =
                buildSeriesFullRangeSql(
                    tableName,
                    series.sourceTagName,
                    columns,
                );
            const requestKey: string = sqlQueries.join('\u0000');
            if (!rangeRequests.has(requestKey)) {
                rangeRequests.set(
                    requestKey,
                    fetchSingleSeriesRange(
                        usesNumericTime,
                        sqlQueries,
                    ).catch((error: unknown) =>
                        reportSeriesError(series, error)),
                );
            }
        } catch (error) {
            reportSeriesError(series, error);
        }
    }

    const ranges: AxisRange[] = (
        await Promise.all(rangeRequests.values())
    ).filter((range): range is AxisRange => range !== undefined);
    if (ranges.length === 0) {
        throw new Error(
            errors[0] ??
                'Cannot resolve a full range because no series has a usable data range.',
        );
    }
    return ranges.reduce(getEnclosingRange);
}

async function fetchSingleSeriesRange(
    usesNumericTime: boolean,
    sqlQueries: SeriesFullRangeSqlQueries,
): Promise<AxisRange> {
    const responses: QueryResponse[] = await Promise.all(
        sqlQueries.map(fetchSeriesRangeResponse),
    );
    const divisor: number = usesNumericTime
        ? 1
        : NANOSECONDS_PER_MILLISECOND;
    const row: unknown = responses.length === 1
        ? responses[0].rows[0]
        : responses.map(getBoundaryValue);
    const noDataError: Error = new Error('Data does not exist.');
    if (row === undefined) throw noDataError;
    if (!Array.isArray(row) || row.length < 2) {
        throw new Error(MALFORMED_RANGE_MESSAGE);
    }

    const [startValue, endValue]: unknown[] = row;
    if (startValue === null || endValue === null) throw noDataError;
    const start: number | undefined = parseFiniteNumber(startValue);
    const end: number | undefined = parseFiniteNumber(endValue);
    if (start === undefined || end === undefined) {
        throw new Error(MALFORMED_RANGE_MESSAGE);
    }
    if (start === end) {
        throw new Error('Data range has zero width.');
    }
    const first = start / divisor;
    const second = end / divisor;
    const fullRange = createNonEmptyAxisRange(first, second);
    if (!fullRange) throw noDataError;

    return fullRange;
}

async function fetchSeriesRangeResponse(sql: string): Promise<QueryResponse> {
    return parseQueryResponse(
        await requestSqlQuery(sql),
        RANGE_REQUEST_FAILED_MESSAGE,
        MALFORMED_RANGE_MESSAGE,
    );
}

function getBoundaryValue(response: QueryResponse): unknown {
    const row: unknown = response.rows[0];
    if (row === undefined) return null;
    if (!Array.isArray(row) || row.length === 0) {
        throw new Error(MALFORMED_RANGE_MESSAGE);
    }
    return row[0];
}

function getSeriesFullRangeErrorMessage(
    series: SeriesFullRangeSource,
    error: unknown,
): string {
    const target: string = `${series.table.trim() || '<missing table>'}.${
        series.sourceTagName.trim() || '<missing tag>'
    }`;
    return `${target}: ${getUnknownErrorMessage(
        error,
        RANGE_REQUEST_FAILED_MESSAGE,
    )}`;
}

export const seriesDataApi = {
    rawRowLimit: RAW_SERIES_ROW_LIMIT,
    fetchSeriesFullRange,
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
    fetchSampledRawSeriesRows,
};
