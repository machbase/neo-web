import type { RawFetchSampling, SeriesFetchColumnMap } from '../FetchTypes';
import {
    applyRawSeriesFetchLimit,
    buildRawSeriesOrderBySqlClause,
    buildRawSeriesSamplingHint,
} from './queryBuildingHelper/RawSeriesFetchSqlQueryHelper';
import { convertTimeRangeMsToTimeRangeNs } from './queryBuildingHelper/FetchTimeRangeUnitConverter';
import type { UnixMilliseconds } from '../../time/types/TimeTypes';

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
export function buildRawSeriesFetchSqlQuery(
    aTableName: string,
    aTagName: string,
    aStartTime: UnixMilliseconds,
    aEndTime: UnixMilliseconds,
    aSortDirection: number | undefined,
    aRowCount: number,
    aColumnMap: SeriesFetchColumnMap,
    aSampling: RawFetchSampling,
): string {
    const { startTime: sStartTime, endTime: sEndTime } = convertTimeRangeMsToTimeRangeNs({
        startTime: aStartTime,
        endTime: aEndTime,
    });
    const sNameColumn = aColumnMap.name;
    const sTimeColumn = aColumnMap.time;
    const sValueColumn = aColumnMap.value;
    const sTimeExpression = `to_timestamp(${sTimeColumn}) / 1000000.0 as date`;
    const sValueExpression = `${sValueColumn} as value`;
    const sSamplingHint = buildRawSeriesSamplingHint(aSampling);
    const sBaseQuery = `SELECT${sSamplingHint} ${sTimeExpression}, ${sValueExpression} FROM ${aTableName} WHERE ${sNameColumn} = '${aTagName}' AND ${sTimeColumn} BETWEEN ${sStartTime} AND ${sEndTime}`;
    const sOrderedQuery = `${sBaseQuery}${buildRawSeriesOrderBySqlClause(aSortDirection)}`;

    return applyRawSeriesFetchLimit(sOrderedQuery, aRowCount, aSampling);
}
