import { ADMIN_ID } from '@/utils/constants';
import type { TableTagMap } from '../FetchTypes';
import {
    AS_KEYWORD,
    MAX_TIME_RESULT_ALIAS,
    MIN_TIME_RESULT_ALIAS,
    NAME_COLUMN_NAME,
    TIME_COLUMN_NAME,
    UNION_ALL_KEYWORD,
    WHERE_KEYWORD,
} from './SqlConstants';
import {
    buildLimitSqlPart,
    buildQuerySql,
    buildSelectSqlPart,
    buildSubSqlTargetSqlPart,
    buildTableTargetSqlPart,
} from './parts/BuildSqlParts';

/**
 * Builds the grouped series time-boundary SQL.
 * Intent: Compose the per-table boundary SQL strings into one `UNION ALL` statement for the repository.
 * @param {TableTagMap[]} tableTagMap - The grouped table mappings to read.
 * @returns {string} The boundary SQL.
 */
export function buildGroupedSeriesTimeBoundarySql(tableTagMap: TableTagMap[]): string {
    return tableTagMap
        .map((info) => buildTableTimeBoundarySql(info))
        .join(` ${UNION_ALL_KEYWORD} `);
}

function buildTableTimeBoundarySql(info: TableTagMap): string {
    const sTableInfo = info.table.split('.');

    if (sTableInfo.length === 3) {
        return buildMountedDatabaseTimeBoundarySql(info, sTableInfo);
    }

    return buildMachbaseStatTimeBoundarySql(info, sTableInfo);
}

function buildMountedDatabaseTimeBoundarySql(
    info: TableTagMap,
    tableInfo: string[],
): string {
    const sTagName = info.tags[0];
    const sTableName = info.table;
    const sRawTableName = tableInfo.at(-1);
    const sForwardScanSql = buildQuerySql(
        buildSelectSqlPart(`/*+ SCAN_FORWARD(${sRawTableName}) */ ${TIME_COLUMN_NAME}`),
        buildTableTargetSqlPart(sTableName),
        `${WHERE_KEYWORD} ${info.cols.name} = '${sTagName}'`,
        '',
        '',
        buildLimitSqlPart(1),
    );
    const sBackwardScanSql = buildQuerySql(
        buildSelectSqlPart(`/*+ SCAN_BACKWARD(${sRawTableName}) */ ${TIME_COLUMN_NAME}`),
        buildTableTargetSqlPart(sTableName),
        `${WHERE_KEYWORD} ${info.cols.name} = '${sTagName}'`,
        '',
        '',
        buildLimitSqlPart(1),
    );
    const sTimeSampleSql = `${buildQuerySql(
        buildSelectSqlPart(TIME_COLUMN_NAME),
        buildSubSqlTargetSqlPart(sForwardScanSql),
    )} ${UNION_ALL_KEYWORD} ${buildQuerySql(
        buildSelectSqlPart(TIME_COLUMN_NAME),
        buildSubSqlTargetSqlPart(sBackwardScanSql),
    )}`;

    return buildQuerySql(
        buildSelectSqlPart([
            `MIN(${TIME_COLUMN_NAME}) ${AS_KEYWORD} ${MIN_TIME_RESULT_ALIAS}`,
            `MAX(${TIME_COLUMN_NAME}) ${AS_KEYWORD} ${MAX_TIME_RESULT_ALIAS}`,
        ].join(', ')),
        buildSubSqlTargetSqlPart(sTimeSampleSql),
    );
}

function buildMachbaseStatTimeBoundarySql(
    info: TableTagMap,
    tableInfo: string[],
): string {
    const sTableName = tableInfo.length === 2 ? tableInfo[1] : info.table;
    const sUserName = tableInfo.length === 2
        ? tableInfo[0]
        : ADMIN_ID.toUpperCase();
    const sTags = info.tags.map((tag) => `'${tag}'`).join(',');

    return buildQuerySql(
        buildSelectSqlPart([
            `MIN(min_time) ${AS_KEYWORD} ${MIN_TIME_RESULT_ALIAS}`,
            `MAX(max_time) ${AS_KEYWORD} ${MAX_TIME_RESULT_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(`${sUserName}.v$${sTableName}_stat`),
        `${WHERE_KEYWORD} ${NAME_COLUMN_NAME} IN (${sTags})`,
    );
}
