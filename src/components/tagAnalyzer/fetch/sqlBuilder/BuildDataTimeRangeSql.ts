import { ADMIN_ID } from '@/utils/constants';
import type { TableTagMap } from '../FetchContracts';
import {
    AS_KEYWORD,
    AND_KEYWORD,
    MAX_TIME_COLUMN_NAME,
    MAX_TIME_RESULT_ALIAS,
    MIN_TIME_COLUMN_NAME,
    MIN_TIME_RESULT_ALIAS,
    NAME_COLUMN_NAME,
    TIME_COLUMN_NAME,
    UNION_ALL_KEYWORD,
    WHERE_KEYWORD,
    buildLimitSqlPart,
    buildQuerySql,
    buildSelectSqlPart,
    buildSubSqlTargetSqlPart,
    buildTableTargetSqlPart,
    IN_KEYWORD,
} from './parts/BuildSqlParts';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';

export function buildGroupedSeriesDataTimeRangeSql(tableTagMap: TableTagMap[]): string {
    return tableTagMap.map((info) => buildTableDataTimeRangeSql(info)).join(` ${UNION_ALL_KEYWORD} `);
}

export function buildVirtualStatOrMountedTableDataTimeRangeSql(
    tableName: string,
    tagNameList: string[],
    timeColumnName = TIME_COLUMN_NAME,
): string {
    const sSplitTable = tableName.split('.');

    if (sSplitTable.length > 2) {
        return buildQuerySql(
            buildSelectSqlPart(`MIN(${timeColumnName}), MAX(${timeColumnName})`),
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

function buildTableDataTimeRangeSql(info: TableTagMap): string {
    const sTableInfo = info.table.split('.');

    if (isNumericBaseTimeSourceColumns(info.cols)) {
        return buildNumericBaseTimeRangeSql(info, sTableInfo);
    }

    if (sTableInfo.length === 3) {
        return buildMountedDatabaseTimeRangeSql(info, sTableInfo);
    }

    return buildMachbaseStatTimeRangeSql(info, sTableInfo);
}

function buildNumericBaseTimeRangeSql(
    info: TableTagMap,
    tableInfo: string[],
): string {
    const sTableName = tableInfo.length === 1
        ? `${ADMIN_ID}.${info.table}`
        : info.table;
    const sTags = info.tags.map((tag) => `'${tag}'`).join(',');

    return buildQuerySql(
        buildSelectSqlPart([
            `MIN(${info.cols.time}) ${AS_KEYWORD} ${MIN_TIME_RESULT_ALIAS}`,
            `MAX(${info.cols.time}) ${AS_KEYWORD} ${MAX_TIME_RESULT_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(sTableName),
        `${WHERE_KEYWORD} ${info.cols.name} ${IN_KEYWORD} (${sTags}) ${AND_KEYWORD} ${info.cols.time} IS NOT NULL`,
    );
}

function buildMountedDatabaseTimeRangeSql(
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

function buildMachbaseStatTimeRangeSql(
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
