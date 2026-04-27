import { ADMIN_ID } from '@/utils/constants';
import type { VirtualStatTagSet } from '../FetchTypes';
import {
    MAX_TIME_COLUMN_NAME,
    MIN_TIME_COLUMN_NAME,
    NAME_COLUMN_NAME,
    TIME_COLUMN_NAME,
    WHERE_KEYWORD,
} from './SqlConstants';
import {
    buildQuerySql,
    buildSelectSqlPart,
    buildTableTargetSqlPart,
} from './parts/BuildSqlParts';

/**
 * Builds the time-boundary SQL for a virtual-stat or mounted-table source.
 * Intent: Keep mounted-table and virtual-stat boundary SQL formatting in one focused helper.
 * @param {string} tableName - The source table to inspect.
 * @param {string[]} tagNameList - The tag names to include.
 * @param {VirtualStatTagSet} [tagSet] - The optional source-column override.
 * @returns {string} The boundary SQL.
 */
export function buildVirtualStatOrMountedTableBoundarySql(
    tableName: string,
    tagNameList: string[],
    tagSet?: VirtualStatTagSet,
): string {
    const sTimeColumn = tagSet?.sourceColumns.time ?? TIME_COLUMN_NAME;
    const sSplitTable = tableName.split('.');

    if (sSplitTable.length > 2) {
        return buildQuerySql(
            buildSelectSqlPart(`MIN(${sTimeColumn}), MAX(${sTimeColumn})`),
            buildTableTargetSqlPart(tableName),
        );
    }

    const sDatabaseName = sSplitTable.length === 1 ? ADMIN_ID : sSplitTable[0];
    const sSourceTableName = sSplitTable.at(-1);
    const sTagFilter = tagNameList.join("','");

    return buildQuerySql(
        buildSelectSqlPart(`${MIN_TIME_COLUMN_NAME}, ${MAX_TIME_COLUMN_NAME}`),
        buildTableTargetSqlPart(`${sDatabaseName}.V$${sSourceTableName}_STAT`),
        `${WHERE_KEYWORD} ${NAME_COLUMN_NAME} IN ('${sTagFilter}')`,
    );
}
