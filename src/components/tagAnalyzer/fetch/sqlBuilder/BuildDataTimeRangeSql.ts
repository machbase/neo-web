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
    UNION_ALL_KEYWORD,
    WHERE_KEYWORD,
    buildQuerySql,
    buildSelectSqlPart,
    buildTableTargetSqlPart,
    IN_KEYWORD,
} from './parts/BuildSqlParts';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteralList,
} from './SqlTextUtils';

export function buildGroupedSeriesDataTimeRangeSql(tableTagMap: TableTagMap[]): string {
    return tableTagMap.map((info) => buildTableDataTimeRangeSql(info)).join(` ${UNION_ALL_KEYWORD} `);
}

export function buildVirtualStatOrMountedTableDataTimeRangeSql(
    tableName: string,
    tagNameList: string[],
): string {
    const sSplitTable = tableName.split('.');
    const sUserName = getVirtualStatUserName(sSplitTable);
    const sSourceTableName = sSplitTable.at(-1) ?? tableName;

    return buildVirtualStatTimeRangeSql(
        sUserName,
        sSourceTableName,
        tagNameList,
    );
}

function buildTableDataTimeRangeSql(info: TableTagMap): string {
    const sTableInfo = info.table.split('.');

    if (isNumericBaseTimeSourceColumns(info.cols)) {
        return buildNumericBaseTimeRangeSql(info, sTableInfo);
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
    const sTags = buildSqlStringLiteralList(info.tags);
    const sTimeColumn = buildSqlIdentifierPath(info.cols.time, 'SQL time column');
    const sNameColumn = buildSqlIdentifierPath(
        info.cols.name,
        'SQL tag name column',
    );

    return buildQuerySql(
        buildSelectSqlPart([
            `MIN(${sTimeColumn}) ${AS_KEYWORD} ${MIN_TIME_RESULT_ALIAS}`,
            `MAX(${sTimeColumn}) ${AS_KEYWORD} ${MAX_TIME_RESULT_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(sTableName),
        `${WHERE_KEYWORD} ${sNameColumn} ${IN_KEYWORD} (${sTags}) ${AND_KEYWORD} ${sTimeColumn} IS NOT NULL`,
    );
}

function buildMachbaseStatTimeRangeSql(
    info: TableTagMap,
    tableInfo: string[],
): string {
    const sTableName = tableInfo.at(-1) ?? info.table;
    const sUserName = getVirtualStatUserName(tableInfo);

    return buildVirtualStatTimeRangeSql(sUserName, sTableName, info.tags);
}

function buildVirtualStatTimeRangeSql(
    userName: string,
    tableName: string,
    tagNameList: string[],
): string {
    const sTags = buildSqlStringLiteralList(tagNameList);
    const sVirtualStatTableName = buildVirtualStatTableName(userName, tableName);

    return buildQuerySql(
        buildSelectSqlPart([
            `${MIN_TIME_COLUMN_NAME} ${AS_KEYWORD} ${MIN_TIME_RESULT_ALIAS}`,
            `${MAX_TIME_COLUMN_NAME} ${AS_KEYWORD} ${MAX_TIME_RESULT_ALIAS}`,
        ].join(', ')),
        buildTableTargetSqlPart(sVirtualStatTableName),
        `${WHERE_KEYWORD} ${NAME_COLUMN_NAME} ${IN_KEYWORD} (${sTags})`,
    );
}

function getVirtualStatUserName(tableInfo: string[]): string {
    if (tableInfo.length === 1) {
        return ADMIN_ID.toUpperCase();
    }

    if (tableInfo.length === 2) {
        return tableInfo[0];
    }

    return tableInfo.at(-2) ?? ADMIN_ID.toUpperCase();
}

function buildVirtualStatTableName(
    userName: string,
    tableName: string,
): string {
    const sSourceTableName = getVirtualStatSourceTableName(tableName);

    return buildSqlIdentifierPath(
        `${userName}.V$${sSourceTableName}_STAT`,
        'SQL virtual stat table name',
    );
}

function getVirtualStatSourceTableName(tableName: string): string {
    const sTableName = tableName.split('.').at(-1) ?? tableName;
    const sVirtualStatMatch = sTableName.match(/^V\$(.*)_STAT$/i);

    return sVirtualStatMatch ? sVirtualStatMatch[1] : sTableName;
}
