import type { SeriesFetchColumnMap } from './FetchContracts';
import { resolveFetchTimeBounds } from './FetchTimeBoundsNormalizer';

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
 * @param {number | string | undefined} aSamplingValue - The sampling value to send with the query hint.
 * @param {boolean | undefined} aUseSampling - Whether the raw query should include sampling.
 * @returns {string} The SQL query body for the raw fetch.
 */
export function buildRawQuery(
    aTableName: string,
    aTagName: string,
    aStartTime: number,
    aEndTime: number,
    aSortDirection: number | undefined,
    aRowCount: number,
    aColumnMap: SeriesFetchColumnMap,
    aSamplingValue: number | string | undefined,
    aUseSampling: boolean | undefined,
): string {
    let sOrderBy = '';
    const { startTime: sStartTime, endTime: sEndTime } = resolveFetchTimeBounds(
        aStartTime,
        aEndTime,
    );

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

    let sQuery = `SELECT${
        aUseSampling ? '/*+ SAMPLING(' + aSamplingValue + ') */' : ''
    } ${sTimeQ}, ${sValueQ} FROM ${aTableName} WHERE ${sNameCol} = '${aTagName}' AND ${sTimeCol} BETWEEN ${sStartTime} AND ${sEndTime}`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }

    if (aSamplingValue) {
        sQuery = 'select * from (' + sQuery + ') LIMIT ' + 200000;
    } else if (aRowCount > 0) {
        sQuery = sQuery + ' LIMIT ' + aRowCount;
    }

    return sQuery;
}
