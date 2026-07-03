import request from '@/api/core';
import { ADMIN_ID } from '@/utils/constants';
import {
    buildGroupedSeriesDataTimeRangeSql,
    getSeriesDataTimeRangeTargetTableName,
} from '../sqlBuilder/BuildDataTimeRangeSql';
import type {
    DataAvailabilityIssue,
    DataAvailabilityIssueKind,
    DataAvailabilityResult,
    DataRangeSeries,
    TableTagMap,
} from './PanelDataFetchTypes';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import { NANOSECONDS_PER_MILLISECOND } from '../../domain/time/TimeConstants';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import {
    getQueryResponseErrorMessage,
    getQueryRowsOrThrow,
    getUnknownErrorMessage,
    type QueryResponseLike,
} from '../QueryResponseUtils';
import {
    buildSqlStringLiteral,
    joinSqlLines,
} from '../sqlBuilder/SqlTextUtils';

const TABLE_DOES_NOT_EXIST_PREFIX = 'Table does not exist';
const TABLES_DO_NOT_EXIST_PREFIX = 'Tables do not exist';
const TAG_DOES_NOT_EXIST_PREFIX = 'Tag does not exist';
const TAGS_DO_NOT_EXIST_PREFIX = 'Tags do not exist';
const DATA_DOES_NOT_EXIST_PREFIX = 'Data does not exist';
const TABLE_DOES_NOT_EXIST_MESSAGE = `${TABLE_DOES_NOT_EXIST_PREFIX}.`;
const TAG_DOES_NOT_EXIST_MESSAGE = `${TAG_DOES_NOT_EXIST_PREFIX}.`;
const DATA_DOES_NOT_EXIST_MESSAGE = `${DATA_DOES_NOT_EXIST_PREFIX}.`;
const MIXED_SERIES_AVAILABILITY_MESSAGE = 'Some series could not be loaded.';
const MIXED_SERIES_AVAILABILITY_PREFIX = 'Some series could not be loaded';
const SERIES_DATA_REQUEST_FAILED_MESSAGE = 'Series data request failed.';
const DATA_AVAILABILITY_REQUEST_FAILED_MESSAGE = 'Data availability request failed.';
const MALFORMED_QUERY_ROWS_MESSAGE = 'Data availability response contained malformed rows.';

type DataTimeRangeRow = [number, number];

type ResolvedDataRangeSeries<T extends DataRangeSeries = DataRangeSeries> = Omit<
    T,
    'sourceTagName'
> & {
    sourceTagName: string;
};

type DataRangeSeriesResolution<T extends DataRangeSeries> =
    | {
          kind: 'success';
          series: ResolvedDataRangeSeries<T>;
      }
    | {
          kind: 'issue';
          issue: DataAvailabilityIssue;
      };

type QueryRowsParser<TRow> = (rows: unknown[]) => TRow[];

type AvailabilityQueryResult<TRow> =
    | {
          kind: 'success';
          rows: TRow[];
      }
    | {
          kind: 'request-failed';
          message: string;
      };

type AvailabilityCheck =
    | {
          kind: 'available';
      }
    | {
          kind: 'unavailable';
      }
    | {
          kind: 'request-failed';
          message: string;
      };

type DataRangeFetchGroup<T extends DataRangeSeries = DataRangeSeries> = {
    tableTagMap: TableTagMap;
    targetTableName: string;
    seriesList: Array<ResolvedDataRangeSeries<T>>;
};

type SeriesTimeRangeResult =
    | {
          kind: 'success';
          timeRange: TimeRangeMs;
      }
    | {
          kind: 'issue';
          issue: DataAvailabilityIssue;
      };

const TABLE_AVAILABILITY_CACHE = new Map<string, Promise<AvailabilityCheck>>();

export async function fetchSeriesDataAvailability<T extends DataRangeSeries>(
    seriesList: T[],
): Promise<DataAvailabilityResult> {
    if (seriesList.length === 0) {
        return {
            timeRange: undefined,
            issues: [],
        };
    }

    assertCompatibleRangeSeries(seriesList);

    const sResolvedSeries: Array<ResolvedDataRangeSeries<T>> = [];
    const sValidRanges: TimeRangeMs[] = [];
    const sIssues: DataAvailabilityIssue[] = [];

    for (const sRawSeries of seriesList) {
        const sSeriesResolution = resolveDataRangeSeries(sRawSeries);
        if (sSeriesResolution.kind === 'issue') {
            sIssues.push(sSeriesResolution.issue);
            continue;
        }

        sResolvedSeries.push(sSeriesResolution.series);
    }

    const sRangeFetchGroups = createDataRangeFetchGroups(sResolvedSeries);

    for (const sGroup of sRangeFetchGroups) {
        const sTableAvailability = await getCachedTableAvailability(
            sGroup.targetTableName,
        );
        const sTableIssue = getTableAvailabilityIssue(sGroup, sTableAvailability);
        if (sTableIssue) {
            sIssues.push(sTableIssue);
            continue;
        }

        const sRangeResult = await fetchSeriesGroupDataTimeRange(sGroup);
        if (sRangeResult.kind === 'issue') {
            sIssues.push(sRangeResult.issue);
            continue;
        }

        sValidRanges.push(sRangeResult.timeRange);
    }

    return {
        timeRange: createCombinedDataTimeRange(sValidRanges),
        issues: sIssues,
    };
}

export function getDataAvailabilityToastMessage(
    issues: DataAvailabilityIssue[],
): string | undefined {
    if (issues.length === 0) {
        return undefined;
    }

    const sIssueKinds = new Set(issues.map((issue) => issue.kind));
    if (sIssueKinds.size !== 1) {
        return formatMixedAvailabilityToastMessage(issues);
    }

    switch (issues[0].kind) {
        case 'missing-table':
            return formatTargetedAvailabilityToastMessage({
                issues,
                getTarget: (issue) => issue.table,
                singularPrefix: TABLE_DOES_NOT_EXIST_PREFIX,
                pluralPrefix: TABLES_DO_NOT_EXIST_PREFIX,
            });
        case 'missing-tag':
            return formatTargetedAvailabilityToastMessage({
                issues,
                getTarget: getSeriesIssueTarget,
                singularPrefix: TAG_DOES_NOT_EXIST_PREFIX,
                pluralPrefix: TAGS_DO_NOT_EXIST_PREFIX,
            });
        case 'no-data':
            return formatTargetedAvailabilityToastMessage({
                issues,
                getTarget: getSeriesIssueTarget,
                singularPrefix: DATA_DOES_NOT_EXIST_PREFIX,
                pluralPrefix: DATA_DOES_NOT_EXIST_PREFIX,
            });
        case 'request-failed':
            return issues[0].message || SERIES_DATA_REQUEST_FAILED_MESSAGE;
    }
}

function formatMixedAvailabilityToastMessage(
    issues: DataAvailabilityIssue[],
): string {
    const sDetails = [
        formatMixedIssueGroup(
            issues,
            'missing-table',
            'missing table',
            (issue) => issue.table,
        ),
        formatMixedIssueGroup(
            issues,
            'missing-tag',
            'missing tag',
            getSeriesIssueTarget,
        ),
        formatMixedIssueGroup(
            issues,
            'no-data',
            'no data',
            getSeriesIssueTarget,
        ),
        formatMixedIssueGroup(
            issues,
            'request-failed',
            'request failed',
            (issue) => issue.message || SERIES_DATA_REQUEST_FAILED_MESSAGE,
        ),
    ].filter((detail): detail is string => detail !== undefined);

    if (sDetails.length === 0) {
        return MIXED_SERIES_AVAILABILITY_MESSAGE;
    }

    return `${MIXED_SERIES_AVAILABILITY_PREFIX}: ${sDetails.join('; ')}.`;
}

function formatMixedIssueGroup(
    issues: DataAvailabilityIssue[],
    kind: DataAvailabilityIssueKind,
    label: string,
    getTarget: (issue: DataAvailabilityIssue) => string,
): string | undefined {
    const sTargets = getUniqueIssueTargets(
        issues.filter((issue) => issue.kind === kind),
        getTarget,
    );

    return sTargets.length > 0 ? `${label} ${sTargets.join(', ')}` : undefined;
}

function formatTargetedAvailabilityToastMessage({
    issues,
    getTarget,
    singularPrefix,
    pluralPrefix,
}: {
    issues: DataAvailabilityIssue[];
    getTarget: (issue: DataAvailabilityIssue) => string;
    singularPrefix: string;
    pluralPrefix: string;
}): string {
    const sTargets = getUniqueIssueTargets(issues, getTarget);
    if (sTargets.length === 0) {
        return `${singularPrefix}.`;
    }

    const sPrefix = sTargets.length === 1 ? singularPrefix : pluralPrefix;
    return `${sPrefix}: ${sTargets.join(', ')}.`;
}

function getUniqueIssueTargets(
    issues: DataAvailabilityIssue[],
    getTarget: (issue: DataAvailabilityIssue) => string,
): string[] {
    return Array.from(
        new Set(
            issues
                .map(getTarget)
                .map((target) => target.trim())
                .filter((target) => target.length > 0),
        ),
    );
}

function getSeriesIssueTarget(issue: DataAvailabilityIssue): string {
    return issue.tagName ? `${issue.table}.${issue.tagName}` : issue.table;
}

function assertCompatibleRangeSeries<T extends DataRangeSeries>(
    seriesList: T[],
): void {
    const sHasNumericBaseTime = seriesList.some((series) =>
        isNumericBaseTimeSourceColumns(series.sourceColumns),
    );
    const sHasDateTimeAxis = seriesList.some(
        (series) => !isNumericBaseTimeSourceColumns(series.sourceColumns),
    );

    if (sHasNumericBaseTime && sHasDateTimeAxis) {
        throw new Error(
            'Numeric basetime and datetime series cannot be mixed in one panel.',
        );
    }
}

function resolveDataRangeSeries<T extends DataRangeSeries>(
    series: T,
): DataRangeSeriesResolution<T> {
    if (series.table.length === 0) {
        return {
            kind: 'issue',
            issue: buildDataAvailabilityIssue(
                'missing-table',
                series,
                TABLE_DOES_NOT_EXIST_MESSAGE,
            ),
        };
    }

    if (series.sourceTagName === undefined || series.sourceTagName.length === 0) {
        return {
            kind: 'issue',
            issue: buildDataAvailabilityIssue(
                'missing-tag',
                series,
                TAG_DOES_NOT_EXIST_MESSAGE,
            ),
        };
    }

    return {
        kind: 'success',
        series: {
            ...series,
            sourceTagName: series.sourceTagName,
        },
    };
}

function createDataRangeFetchGroups<T extends DataRangeSeries>(
    seriesList: Array<ResolvedDataRangeSeries<T>>,
): Array<DataRangeFetchGroup<T>> {
    const sGroupByKey = new Map<string, DataRangeFetchGroup<T>>();

    for (const sSeries of seriesList) {
        const sTableTagMap = createTableTagMapForSeries(sSeries);
        const sTargetTableName =
            getSeriesDataTimeRangeTargetTableName(sTableTagMap);
        const sGroupKey = buildDataRangeFetchGroupKey(
            sSeries,
            sTargetTableName,
        );
        const sExistingGroup = sGroupByKey.get(sGroupKey);
        if (sExistingGroup) {
            sExistingGroup.seriesList.push(sSeries);
            continue;
        }

        sGroupByKey.set(sGroupKey, {
            tableTagMap: sTableTagMap,
            targetTableName: sTargetTableName,
            seriesList: [sSeries],
        });
    }

    return Array.from(sGroupByKey.values());
}

function createTableTagMapForSeries<T extends ResolvedDataRangeSeries>(
    series: T,
): TableTagMap {
    return {
        table: series.table,
        tags: [series.sourceTagName],
        cols: series.sourceColumns,
    };
}

function buildDataRangeFetchGroupKey<T extends ResolvedDataRangeSeries>(
    series: T,
    targetTableName: string,
): string {
    return [
        targetTableName.toUpperCase(),
        series.sourceColumns.name,
        series.sourceColumns.time,
        String(series.sourceColumns.timeBaseTime),
        String(series.sourceColumns.timeType ?? ''),
        series.sourceTagName,
    ].join('\u0000');
}

async function fetchSeriesGroupDataTimeRange<T extends DataRangeSeries>(
    group: DataRangeFetchGroup<T>,
): Promise<SeriesTimeRangeResult> {
    const sResult = await executeAvailabilityQuery(
        () =>
            buildGroupedSeriesDataTimeRangeSql([
                group.tableTagMap,
            ]),
        parseDataTimeRangeRows,
    );
    const sSeries = group.seriesList[0];

    if (sResult.kind === 'request-failed') {
        return {
            kind: 'issue',
            issue: buildDataAvailabilityIssue(
                'request-failed',
                sSeries,
                sResult.message,
            ),
        };
    }

    const sTimeRange = isNumericBaseTimeSourceColumns(sSeries.sourceColumns)
        ? createDataTimeRangeFromMillisecondRows(sResult.rows)
        : createDataTimeRangeFromNanosecondRows(sResult.rows);

    if (!isValidTimeRange(sTimeRange)) {
        return {
            kind: 'issue',
            issue: buildDataAvailabilityIssue(
                'no-data',
                sSeries,
                DATA_DOES_NOT_EXIST_MESSAGE,
            ),
        };
    }

    return {
        kind: 'success',
        timeRange: sTimeRange,
    };
}

async function getCachedTableAvailability(
    tableName: string,
): Promise<AvailabilityCheck> {
    const sCacheKey = tableName.toUpperCase();
    const sExistingCheck = TABLE_AVAILABILITY_CACHE.get(sCacheKey);
    if (sExistingCheck) {
        return sExistingCheck;
    }

    const sCheck = checkTableAvailability(tableName).then((check) => {
        if (check.kind === 'request-failed') {
            TABLE_AVAILABILITY_CACHE.delete(sCacheKey);
        }

        return check;
    });
    TABLE_AVAILABILITY_CACHE.set(sCacheKey, sCheck);
    return sCheck;
}

async function checkTableAvailability(tableName: string): Promise<AvailabilityCheck> {
    return createAvailabilityCheckFromQueryResult(
        await executeAvailabilityQuery(() => buildTableAvailabilitySql(tableName)),
    );
}

function getTableAvailabilityIssue<T extends DataRangeSeries>(
    group: DataRangeFetchGroup<T>,
    check: AvailabilityCheck,
): DataAvailabilityIssue | undefined {
    switch (check.kind) {
        case 'available':
            return undefined;
        case 'request-failed':
            return buildDataAvailabilityIssue(
                'request-failed',
                group.seriesList[0],
                check.message,
            );
        case 'unavailable':
            return {
                kind: 'missing-table',
                table: group.targetTableName,
                message: TABLE_DOES_NOT_EXIST_MESSAGE,
            };
    }
}

async function executeAvailabilityQuery<TRow = unknown>(
    buildSql: () => string,
    parseRows: QueryRowsParser<TRow> = (rows) => rows as TRow[],
): Promise<AvailabilityQueryResult<TRow>> {
    try {
        const sResponse = await request({
            method: 'GET',
            url: '/api/query?q=' + encodeURIComponent(buildSql()),
        });
        const sEnvelope = parseQueryResponseEnvelope(sResponse);
        const sErrorMessage = getQueryResponseErrorMessage(
            sEnvelope,
            DATA_AVAILABILITY_REQUEST_FAILED_MESSAGE,
        );
        if (sErrorMessage) {
            return {
                kind: 'request-failed',
                message: sErrorMessage,
            };
        }

        return {
            kind: 'success',
            rows: parseRows(
                getQueryRowsOrThrow(sEnvelope.data, MALFORMED_QUERY_ROWS_MESSAGE),
            ),
        };
    } catch (error) {
        return {
            kind: 'request-failed',
            message: getUnknownErrorMessage(
                error,
                DATA_AVAILABILITY_REQUEST_FAILED_MESSAGE,
            ),
        };
    }
}

function parseQueryResponseEnvelope(response: unknown): QueryResponseLike {
    if (typeof response !== 'object' || response === null) {
        throw new Error(DATA_AVAILABILITY_REQUEST_FAILED_MESSAGE);
    }

    return response as QueryResponseLike;
}

function createAvailabilityCheckFromQueryResult<TRow>(
    result: AvailabilityQueryResult<TRow>,
): AvailabilityCheck {
    if (result.kind === 'request-failed') {
        return {
            kind: 'request-failed',
            message: result.message,
        };
    }

    return result.rows.length > 0
        ? { kind: 'available' }
        : { kind: 'unavailable' };
}

function parseDataTimeRangeRows(rows: unknown[]): DataTimeRangeRow[] {
    const sParsedRows: DataTimeRangeRow[] = [];

    for (const row of rows) {
        const sParsedRow = parseDataTimeRangeRow(row);
        if (sParsedRow !== undefined) {
            sParsedRows.push(sParsedRow);
        }
    }

    return sParsedRows;
}

function parseDataTimeRangeRow(row: unknown): DataTimeRangeRow | undefined {
    if (!Array.isArray(row) || row.length < 2) {
        throw new Error(MALFORMED_QUERY_ROWS_MESSAGE);
    }

    const [sStartTime, sEndTime] = row;
    if (sStartTime === null || sEndTime === null) {
        return undefined;
    }

    if (!isFiniteNumber(sStartTime) || !isFiniteNumber(sEndTime)) {
        throw new Error(MALFORMED_QUERY_ROWS_MESSAGE);
    }

    return [sStartTime, sEndTime];
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function buildDataAvailabilityIssue<T extends DataRangeSeries>(
    kind: DataAvailabilityIssue['kind'],
    series: T,
    message: string,
): DataAvailabilityIssue {
    return {
        kind,
        table: series.table,
        ...(series.sourceTagName ? { tagName: series.sourceTagName } : {}),
        message,
    };
}

type AvailabilityTableTarget = {
    databaseIdQuery: string;
    userName: string;
    tableName: string;
};

function buildTableAvailabilitySql(tableName: string): string {
    const sTarget = parseAvailabilityTableTarget(tableName);

    if (sTarget.tableName.toUpperCase().startsWith('V$')) {
        return joinSqlLines([
            'SELECT ID FROM v$tables',
            `WHERE NAME = ${buildSqlStringLiteral(sTarget.tableName)}`,
            `  AND USER_ID = (SELECT USER_ID FROM M$SYS_USERS WHERE NAME = ${buildSqlStringLiteral(sTarget.userName)})`,
            'LIMIT 1',
        ]);
    }

    return joinSqlLines([
        'SELECT MT.ID FROM M$SYS_TABLES MT, M$SYS_USERS MU',
        'WHERE MT.USER_ID = MU.USER_ID',
        `  AND MU.NAME = UPPER(${buildSqlStringLiteral(sTarget.userName)})`,
        `  AND MT.DATABASE_ID = ${sTarget.databaseIdQuery}`,
        `  AND MT.NAME = ${buildSqlStringLiteral(sTarget.tableName)}`,
        'LIMIT 1',
    ]);
}

function parseAvailabilityTableTarget(
    tableName: string,
): AvailabilityTableTarget {
    const sTableParts = tableName.split('.');
    const sTableName = sTableParts.at(-1) ?? tableName;
    const sUserName = sTableParts.length >= 2
        ? sTableParts.at(-2) ?? ADMIN_ID.toUpperCase()
        : ADMIN_ID.toUpperCase();
    const sDatabaseName = sTableParts.length >= 3
        ? sTableParts.at(-3)
        : undefined;

    return {
        databaseIdQuery: sDatabaseName
            ? `(SELECT BACKUP_TBSID FROM V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = ${buildSqlStringLiteral(sDatabaseName)})`
            : '-1',
        userName: sUserName,
        tableName: sTableName,
    };
}

function createCombinedDataTimeRange(
    ranges: TimeRangeMs[],
): TimeRangeMs | undefined {
    if (ranges.length === 0) {
        return undefined;
    }

    let sMinTime = ranges[0].startTime;
    let sMaxTime = ranges[0].endTime;

    for (const sRange of ranges.slice(1)) {
        if (sRange.startTime < sMinTime) {
            sMinTime = sRange.startTime;
        }

        if (sRange.endTime > sMaxTime) {
            sMaxTime = sRange.endTime;
        }
    }

    return createTimeRangeMs(sMinTime, sMaxTime);
}

function createDataTimeRangeFromNanosecondRows(
    rows: DataTimeRangeRow[],
): TimeRangeMs | undefined {
    return createDataTimeRangeFromMillisecondRows(
        rows.map(([aStartNanoseconds, aEndNanoseconds]) => [
            Math.floor(aStartNanoseconds / NANOSECONDS_PER_MILLISECOND),
            Math.floor(aEndNanoseconds / NANOSECONDS_PER_MILLISECOND),
        ]),
    );
}

function createDataTimeRangeFromMillisecondRows(
    rows: DataTimeRangeRow[],
): TimeRangeMs | undefined {
    return createCombinedDataTimeRange(
        rows.map(([aMinTime, aMaxTime]) => createTimeRangeMs(aMinTime, aMaxTime)),
    );
}
