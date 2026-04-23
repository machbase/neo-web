import type {
    BoundarySeries,
    VirtualStatTagSet,
} from '../FetchTypes';
import {
    buildMinMaxBoundaryUnionSqlQuery,
    buildVirtualStatBoundarySqlQueryBody,
    groupBoundarySeriesByTable,
} from './queryBuildingHelper/TimeBoundaryFetchSqlQueryHelper';

/**
 * Builds the min/max query text for one grouped series set.
 * Intent: Keep query-string construction separate from repository request code.
 * @param {T[]} aTableTagInfo - The series metadata to query.
 * @param {string} aUserName - The active user name for the query.
 * @returns {string} The min/max SQL query text.
 */
export function buildSeriesMinMaxBoundarySqlQuery<T extends BoundarySeries>(
    aTableTagInfo: T[],
    aUserName: string,
): string {
    return buildMinMaxBoundaryUnionSqlQuery(
        groupBoundarySeriesByTable(aTableTagInfo),
        aUserName,
    );
}

/**
 * Builds the virtual-stat or mounted-table boundary query for a table.
 * Intent: Keep virtual-stat query selection out of the repository transport layer.
 * @param {string} aTableName - The source table to inspect.
 * @param {string[]} aTagNameList - The tag names whose bounds should be resolved.
 * @param {VirtualStatTagSet} [aTagSet] - The optional column mapping used to override the time column.
 * @returns {string} The boundary query text.
 */
export function buildVirtualStatTableBoundarySqlQuery(
    aTableName: string,
    aTagNameList: string[],
    aTagSet?: VirtualStatTagSet,
): string {
    return buildVirtualStatBoundarySqlQueryBody(aTableName, aTagNameList, aTagSet);
}
