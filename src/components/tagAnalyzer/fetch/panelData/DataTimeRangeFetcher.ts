import request from '@/api/core';
import { ADMIN_ID } from '@/utils/constants';
import { buildGroupedSeriesDataTimeRangeSql } from '../sqlBuilder/BuildDataTimeRangeSql';
import type {
    DataAvailabilityIssue,
    DataAvailabilityIssueKind,
    DataAvailabilityResult,
    DataRangeSeries,
} from './PanelDataFetchTypes';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import { NANOSECONDS_PER_MILLISECOND } from '../../domain/time/TimeConstants';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
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

type QueryResponseEnvelope = {
    status: number | undefined;
    statusText: string | undefined;
    success: boolean | undefined;
    data: unknown;
    reason: unknown;
    message: unknown;
    error: unknown;
};

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

type SingleSeriesTimeRangeResult =
    | {
          kind: 'success';
          timeRange: TimeRangeMs;
      }
    | {
          kind: 'issue';
          issue: DataAvailabilityIssue;
      };

type AvailabilityCache = {
    tableByName: Map<string, Promise<AvailabilityCheck>>;
    tagByIdentity: Map<string, Promise<AvailabilityCheck>>;
};

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

    const sCache: AvailabilityCache = {
        tableByName: new Map(),
        tagByIdentity: new Map(),
    };
    const sValidRanges: TimeRangeMs[] = [];
    const sIssues: DataAvailabilityIssue[] = [];

    for (const sRawSeries of seriesList) {
        const sSeriesResolution = resolveDataRangeSeries(sRawSeries);
        if (sSeriesResolution.kind === 'issue') {
            sIssues.push(sSeriesResolution.issue);
            continue;
        }

        const sSeries = sSeriesResolution.series;
        const sTableIssue = await getTableAvailabilityIssue(sSeries, sCache);
        if (sTableIssue) {
            sIssues.push(sTableIssue);
            continue;
        }

        const sTagIssue = await getTagAvailabilityIssue(sSeries, sCache);
        if (sTagIssue) {
            sIssues.push(sTagIssue);
            continue;
        }

        const sRangeResult = await fetchSingleSeriesDataTimeRange(sSeries);
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

async function getTableAvailabilityIssue<T extends ResolvedDataRangeSeries>(
    series: T,
    cache: AvailabilityCache,
): Promise<DataAvailabilityIssue | undefined> {
    return getAvailabilityIssueFromCheck(
        series,
        await getCachedTableAvailability(series.table, cache),
        'missing-table',
    );
}

async function getTagAvailabilityIssue<T extends ResolvedDataRangeSeries>(
    series: T,
    cache: AvailabilityCache,
): Promise<DataAvailabilityIssue | undefined> {
    return getAvailabilityIssueFromCheck(
        series,
        await getCachedTagAvailability(series, cache),
        'missing-tag',
    );
}

function getAvailabilityIssueFromCheck<T extends ResolvedDataRangeSeries>(
    series: T,
    check: AvailabilityCheck,
    missingKind: Extract<DataAvailabilityIssueKind, 'missing-table' | 'missing-tag'>,
): DataAvailabilityIssue | undefined {
    switch (check.kind) {
        case 'available':
            return undefined;
        case 'request-failed':
            return buildDataAvailabilityIssue('request-failed', series, check.message);
        case 'unavailable':
            return buildDataAvailabilityIssue(
                missingKind,
                series,
                getMissingAvailabilityMessage(missingKind),
            );
    }
}

function getCachedTableAvailability(
    tableName: string,
    cache: AvailabilityCache,
): Promise<AvailabilityCheck> {
    const sExistingCheck = cache.tableByName.get(tableName);
    if (sExistingCheck) {
        return sExistingCheck;
    }

    const sCheck = checkTableAvailability(tableName);
    cache.tableByName.set(tableName, sCheck);
    return sCheck;
}

function getCachedTagAvailability<T extends ResolvedDataRangeSeries>(
    series: T,
    cache: AvailabilityCache,
): Promise<AvailabilityCheck> {
    const sTagKey = [
        series.table,
        series.sourceColumns.name,
        series.sourceTagName,
    ].join('\u0000');
    const sExistingCheck = cache.tagByIdentity.get(sTagKey);
    if (sExistingCheck) {
        return sExistingCheck;
    }

    const sCheck = checkTagAvailability(series);
    cache.tagByIdentity.set(sTagKey, sCheck);
    return sCheck;
}

async function checkTableAvailability(tableName: string): Promise<AvailabilityCheck> {
    return createAvailabilityCheckFromQueryResult(
        await executeAvailabilityQuery(
            () => buildTableAvailabilitySql(tableName),
            keepQueryRows,
        ),
    );
}

async function checkTagAvailability<T extends ResolvedDataRangeSeries>(
    series: T,
): Promise<AvailabilityCheck> {
    const sMetadataResult = await executeAvailabilityQuery(
        () => buildMetadataTagAvailabilitySql(series),
        keepQueryRows,
    );
    if (hasAvailabilityRows(sMetadataResult)) {
        return { kind: 'available' };
    }

    const sSourceResult = await executeAvailabilityQuery(
        () => buildSourceTagAvailabilitySql(series),
        keepQueryRows,
    );

    return createAvailabilityCheckFromQueryResult(sSourceResult);
}

async function fetchSingleSeriesDataTimeRange<T extends ResolvedDataRangeSeries>(
    series: T,
): Promise<SingleSeriesTimeRangeResult> {
    const sResult = await executeAvailabilityQuery(
        () =>
            buildGroupedSeriesDataTimeRangeSql([
                {
                    table: series.table,
                    tags: [series.sourceTagName],
                    cols: series.sourceColumns,
                },
            ]),
        parseDataTimeRangeRows,
    );

    if (sResult.kind === 'request-failed') {
        return {
            kind: 'issue',
            issue: buildDataAvailabilityIssue(
                'request-failed',
                series,
                sResult.message,
            ),
        };
    }

    const sTimeRange = isNumericBaseTimeSourceColumns(series.sourceColumns)
        ? createDataTimeRangeFromMillisecondRows(sResult.rows)
        : createDataTimeRangeFromNanosecondRows(sResult.rows);

    if (!isValidTimeRange(sTimeRange)) {
        return {
            kind: 'issue',
            issue: buildDataAvailabilityIssue(
                'no-data',
                series,
                DATA_DOES_NOT_EXIST_MESSAGE,
            ),
        };
    }

    return {
        kind: 'success',
        timeRange: sTimeRange,
    };
}

async function executeAvailabilityQuery<TRow>(
    buildSql: () => string,
    parseRows: QueryRowsParser<TRow>,
): Promise<AvailabilityQueryResult<TRow>> {
    try {
        const sResponse = await request({
            method: 'GET',
            url: '/api/query?q=' + encodeURIComponent(buildSql()),
        });
        const sEnvelope = parseQueryResponseEnvelope(sResponse);
        const sErrorMessage = getAvailabilityQueryErrorMessage(sEnvelope);
        if (sErrorMessage) {
            return {
                kind: 'request-failed',
                message: sErrorMessage,
            };
        }

        return {
            kind: 'success',
            rows: parseRows(getQueryRows(sEnvelope.data)),
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

function hasAvailabilityRows<TRow>(
    result: AvailabilityQueryResult<TRow>,
): boolean {
    return result.kind === 'success' && result.rows.length > 0;
}

function keepQueryRows(rows: unknown[]): unknown[] {
    return rows;
}

function parseQueryResponseEnvelope(response: unknown): QueryResponseEnvelope {
    if (typeof response !== 'object' || response === null) {
        throw new Error(DATA_AVAILABILITY_REQUEST_FAILED_MESSAGE);
    }

    const sResponse = response as Record<string, unknown>;

    return {
        status: getOptionalNumber(sResponse.status),
        statusText: getOptionalString(sResponse.statusText),
        success: getOptionalBoolean(sResponse.success),
        data: sResponse.data,
        reason: sResponse.reason,
        message: sResponse.message,
        error: sResponse.error,
    };
}

function getQueryRows(data: unknown): unknown[] {
    if (typeof data !== 'object' || data === null || !('rows' in data)) {
        throw new Error(MALFORMED_QUERY_ROWS_MESSAGE);
    }

    const rows = (data as { rows: unknown }).rows;
    if (!Array.isArray(rows)) {
        throw new Error(MALFORMED_QUERY_ROWS_MESSAGE);
    }

    return rows;
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

function getOptionalNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
}

function getOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function getOptionalBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function getAvailabilityQueryErrorMessage(
    response: QueryResponseEnvelope,
): string | undefined {
    if (response.status !== undefined && response.status >= 400) {
        return getResponseErrorMessage(response) ?? `Request failed (${response.status})`;
    }

    if (response.success === false) {
        return getResponseErrorMessage(response) ?? DATA_AVAILABILITY_REQUEST_FAILED_MESSAGE;
    }

    return undefined;
}

function getResponseErrorMessage(
    response: QueryResponseEnvelope,
): string | undefined {
    const sDataMessage = getErrorMessageFromValue(response.data);
    if (sDataMessage) {
        return sDataMessage;
    }

    const sTopLevelMessage = getErrorMessageFromValue({
        reason: response.reason,
        message: response.message,
        error: response.error,
    });
    if (sTopLevelMessage) {
        return sTopLevelMessage;
    }

    return response.statusText;
}

function getErrorMessageFromValue(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value);
    }

    if (typeof value !== 'object') {
        return undefined;
    }

    const sMessageContainer = value as {
        reason?: unknown;
        message?: unknown;
        error?: unknown;
    };

    if (sMessageContainer.reason !== undefined) {
        return String(sMessageContainer.reason);
    }

    if (sMessageContainer.message !== undefined) {
        return String(sMessageContainer.message);
    }

    if (sMessageContainer.error !== undefined) {
        return String(sMessageContainer.error);
    }

    const sSerializedValue = JSON.stringify(value);
    return sSerializedValue === '{}' ? undefined : sSerializedValue;
}

function getUnknownErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallbackMessage;
}

function getMissingAvailabilityMessage(
    kind: Extract<DataAvailabilityIssueKind, 'missing-table' | 'missing-tag'>,
): string {
    return kind === 'missing-table'
        ? TABLE_DOES_NOT_EXIST_MESSAGE
        : TAG_DOES_NOT_EXIST_MESSAGE;
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

function buildTableAvailabilitySql(tableName: string): string {
    const sTableParts = tableName.split('.');
    let sDatabaseIdQuery = '';
    let sResolvedTableName = tableName;
    let sUserName = ADMIN_ID.toUpperCase();

    if (tableName.indexOf('.') === -1 || sTableParts.length < 3) {
        sDatabaseIdQuery = String(-1);
        sResolvedTableName = buildSqlIdentifierPath(
            sResolvedTableName,
            'SQL table name',
        );

        if (sTableParts.length === 2) {
            sUserName = buildSqlIdentifierPath(
                sTableParts[0],
                'SQL user name',
            );
            sResolvedTableName = buildSqlIdentifierPath(
                sTableParts[sTableParts.length - 1],
                'SQL table name',
            );
        }
    } else {
        sDatabaseIdQuery = `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = ${buildSqlStringLiteral(sTableParts[0])})`;
        sUserName = buildSqlIdentifierPath(sTableParts[1], 'SQL user name');
        sResolvedTableName = buildSqlIdentifierPath(
            sTableParts[sTableParts.length - 1],
            'SQL table name',
        );
    }

    return `SELECT MC.NAME AS NM FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER(${buildSqlStringLiteral(sUserName)}) AND MC.DATABASE_ID = ${sDatabaseIdQuery} AND MT.NAME = ${buildSqlStringLiteral(sResolvedTableName)} AND MC.NAME <> '_RID' LIMIT 1`;
}

function buildMetadataTagAvailabilitySql<T extends ResolvedDataRangeSeries>(series: T): string {
    const sMetadataTableName = buildMetadataTableName(series.table);
    const sSourceColumn = buildSqlIdentifierPath(
        series.sourceColumns.name,
        'SQL tag column',
    );

    return `select ${sSourceColumn} from ${sMetadataTableName} where ${sSourceColumn} = ${buildSqlStringLiteral(series.sourceTagName)} LIMIT 1`;
}

function buildSourceTagAvailabilitySql<T extends ResolvedDataRangeSeries>(series: T): string {
    const sTableName = buildSqlIdentifierPath(series.table, 'SQL table name');
    const sSourceColumn = buildSqlIdentifierPath(
        series.sourceColumns.name,
        'SQL tag column',
    );

    return `select ${sSourceColumn} from ${sTableName} where ${sSourceColumn} = ${buildSqlStringLiteral(series.sourceTagName)} LIMIT 1`;
}

function buildMetadataTableName(sourceTableName: string): string {
    const sSplitName = sourceTableName.split('.');
    const sTableName = `_${sSplitName.at(-1)}_META`;
    sSplitName.pop();
    sSplitName.push(sTableName);

    return buildSqlIdentifierPath(
        sSplitName.join('.'),
        'SQL metadata table name',
    );
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
    if (rows.length === 0) {
        return undefined;
    }

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
    if (rows.length === 0) {
        return undefined;
    }

    let sMinTime = rows[0][0];
    let sMaxTime = rows[0][1];

    for (const [aMinTime, aMaxTime] of rows.slice(1)) {
        if (aMinTime < sMinTime) {
            sMinTime = aMinTime;
        }

        if (aMaxTime > sMaxTime) {
            sMaxTime = aMaxTime;
        }
    }

    return createTimeRangeMs(sMinTime, sMaxTime);
}
