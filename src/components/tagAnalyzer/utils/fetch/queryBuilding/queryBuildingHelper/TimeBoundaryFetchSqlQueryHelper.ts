import { ADMIN_ID } from '@/utils/constants';
import type {
    BoundarySeries,
    TableTagMap,
    VirtualStatTagSet,
} from '../../FetchTypes';

/**
 * Groups series metadata by table for the min/max query.
 * Intent: Collapse tag configuration into the table-oriented structure expected by the boundary query builder.
 * @param {T[]} aTableTagInfo - The series metadata to group.
 * @returns {TableTagMap[]} The grouped table-to-tag mapping.
 */
export function groupBoundarySeriesByTable<T extends BoundarySeries>(
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

export function buildMinMaxBoundaryUnionSqlQuery(
    aTableTagMap: TableTagMap[],
    aCurrentUserName: string,
): string {
    return aTableTagMap
        .map((aInfo) => buildTableMinMaxBoundarySqlQuery(aInfo, aCurrentUserName))
        .join(' UNION ALL ');
}

function buildTableMinMaxBoundarySqlQuery(
    aInfo: TableTagMap,
    aCurrentUserName: string,
): string {
    const sTableInfo = aInfo.table.split('.');

    if (sTableInfo.length === 3) {
        return buildMountedDatabaseMinMaxBoundarySqlQuery(aInfo, sTableInfo);
    }

    return buildMachbaseStatMinMaxBoundarySqlQuery(aInfo, sTableInfo, aCurrentUserName);
}

function buildMountedDatabaseMinMaxBoundarySqlQuery(
    aInfo: TableTagMap,
    aTableInfo: string[],
): string {
    const sTagName = aInfo.tags[0];
    const sTableName = aInfo.table;
    const sRawTableName = aTableInfo.at(-1);

    return `SELECT 
                MIN(TIME) AS min_tm,
                MAX(TIME) AS max_tm
            FROM (
                SELECT TIME FROM (SELECT /*+ SCAN_FORWARD(${sRawTableName}) */ TIME FROM ${sTableName} WHERE ${aInfo.cols.name} = '${sTagName}' LIMIT 1)
                UNION ALL
                SELECT TIME FROM (SELECT /*+ SCAN_BACKWARD(${sRawTableName}) */ TIME FROM ${sTableName} WHERE ${aInfo.cols.name} = '${sTagName}' LIMIT 1)
            )`;
}

function buildMachbaseStatMinMaxBoundarySqlQuery(
    aInfo: TableTagMap,
    aTableInfo: string[],
    _aCurrentUserName: string,
): string {
    const sTableName = aTableInfo.length === 2 ? aTableInfo[1] : aInfo.table;
    const sUserName = aTableInfo.length === 2
        ? aTableInfo[0]
        : ADMIN_ID.toUpperCase();
    const sTags = aInfo.tags.map((aTag) => `'${aTag}'`).join(',');

    return `select min(min_time) as min_tm, max(max_time) as max_tm from ${sUserName}.v$${sTableName}_stat where NAME in (${sTags})`;
}

export function buildVirtualStatBoundarySqlQueryBody(
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
