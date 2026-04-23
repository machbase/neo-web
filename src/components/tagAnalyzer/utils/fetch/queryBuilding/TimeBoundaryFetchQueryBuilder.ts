import { createMinMaxQuery } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type {
    BoundarySeries,
    TableTagMap,
    VirtualStatTagSet,
} from '../FetchTypes';

/**
 * Groups series metadata by table for the min/max query.
 * Intent: Collapse tag configuration into the table-oriented structure expected by the boundary query builder.
 * @param {T[]} aTableTagInfo - The series metadata to group.
 * @returns {TableTagMap[]} The grouped table-to-tag mapping.
 */
export function createTableTagMap<T extends BoundarySeries>(
    aTableTagInfo: T[],
): TableTagMap[] {
    const sMap: Record<
        string,
        {
            tags: string[];
            cols: T['sourceColumns'];
        }
    > = {};

    aTableTagInfo.forEach((aInfo) => {
        const sExistingEntry = sMap[aInfo.table];
        const sTagName = aInfo.sourceTagName || '';

        if (sExistingEntry) {
            sExistingEntry.tags.push(sTagName);
            return;
        }

        sMap[aInfo.table] = {
            tags: [sTagName],
            cols: aInfo.sourceColumns,
        };
    });

    return Object.keys(sMap).map((aTable) => ({
        table: aTable,
        tags: sMap[aTable].tags,
        cols: sMap[aTable].cols,
    }));
}

/**
 * Builds the min/max query text for one grouped series set.
 * Intent: Keep query-string construction separate from repository request code.
 * @param {T[]} aTableTagInfo - The series metadata to query.
 * @param {string} aUserName - The active user name for the query.
 * @returns {string} The min/max SQL query text.
 */
export function buildMinMaxTableQuery<T extends BoundarySeries>(
    aTableTagInfo: T[],
    aUserName: string,
): string {
    return createMinMaxQuery(createTableTagMap(aTableTagInfo), aUserName);
}

/**
 * Builds the virtual-stat or mounted-table boundary query for a table.
 * Intent: Keep virtual-stat query selection out of the repository transport layer.
 * @param {string} aTableName - The source table to inspect.
 * @param {string[]} aTagNameList - The tag names whose bounds should be resolved.
 * @param {VirtualStatTagSet} [aTagSet] - The optional column mapping used to override the time column.
 * @returns {string} The boundary query text.
 */
export function buildVirtualStatTableQuery(
    aTableName: string,
    aTagNameList: string[],
    aTagSet?: VirtualStatTagSet,
): string {
    const sTimeColumn = aTagSet?.sourceColumns.time ?? 'TIME';
    const sSplitTable = aTableName.split('.');

    if (sSplitTable.length > 2) {
        return `select min(${sTimeColumn}), max(${sTimeColumn}) from ${aTableName}`;
    }

    const sDatabaseName = sSplitTable.length === 1 ? ADMIN_ID : sSplitTable[0];
    const sSourceTableName = sSplitTable.at(-1);
    const sTagFilter = aTagNameList.join("','");

    return `select min_time, max_time from ${sDatabaseName}.V$${sSourceTableName}_STAT WHERE NAME IN ('${sTagFilter}')`;
}
