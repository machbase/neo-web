import type { RawFetchSampling, SeriesFetchColumnMap } from './FetchContracts';
import { convertTimeRangeMsToTimeRangeNs } from './FetchTimeBoundsNormalizer';
import type { UnixMilliseconds } from '../time/timeTypes';

/**
 * Wraps a SQL statement with the TQL CSV envelope used by the chart fetch endpoints.
 * Intent: Keep every chart fetch query using the same TQL CSV wrapper.
 * @param {string} aSqlQuery - The SQL query body to wrap.
 * @returns {string} The wrapped TQL CSV query string.
 */
export function buildCsvTqlQuery(aSqlQuery: string): string {
    return `SQL("${aSqlQuery}")\nCSV()`;
}

/**
 * Builds the raw-series SQL query body.
 * Intent: Centralize raw query construction so ordering, limits, and sampling stay consistent.
 * @param {string} aTableName - The source table name.
 * @param {string} aTagName - The tag name to query.
 * @param {number} aStartTime - The requested start timestamp.
 * @param {number} aEndTime - The requested end timestamp.
 * @param {number | undefined} aSortDirection - The optional sort direction flag.
 * @param {number} aRowCount - The maximum row count to request.
 * @param {SeriesFetchColumnMap} aColumnMap - The column mapping for the source table.
 * @param {RawFetchSampling} aSampling - The explicit raw-fetch sampling mode.
 * @returns {string} The SQL query body for the raw fetch.
 */
export function buildRawQuery(
    aTableName: string,
    aTagName: string,
    aStartTime: UnixMilliseconds,
    aEndTime: UnixMilliseconds,
    aSortDirection: number | undefined,
    aRowCount: number,
    aColumnMap: SeriesFetchColumnMap,
    aSampling: RawFetchSampling,
): string {
    let sOrderBy = '';
    const { startTime: sStartTime, endTime: sEndTime } = convertTimeRangeMsToTimeRangeNs({
        startTime: aStartTime,
        endTime: aEndTime,
    });

    if (aSortDirection === 1) {
        sOrderBy = '1 desc';
    } else if (aSortDirection === 2) {
        sOrderBy = '1';
    }

    const sNameCol = aColumnMap.name;
    const sTimeCol = aColumnMap.time;
    const sValueCol = aColumnMap.value;
    const sTimeQ = `to_timestamp(${sTimeCol}) / 1000000.0 as date`;
    const sValueQ = `${sValueCol} as value`;
    const sSamplingHint =
        aSampling.kind === 'enabled' ? `/*+ SAMPLING(${aSampling.value}) */` : '';

    let sQuery = `SELECT${sSamplingHint} ${sTimeQ}, ${sValueQ} FROM ${aTableName} WHERE ${sNameCol} = '${aTagName}' AND ${sTimeCol} BETWEEN ${sStartTime} AND ${sEndTime}`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }

    if (aSampling.kind === 'enabled') {
        sQuery = 'select * from (' + sQuery + ') LIMIT ' + 200000;
    } else if (aRowCount > 0) {
        sQuery = sQuery + ' LIMIT ' + aRowCount;
    }

    return sQuery;
}
