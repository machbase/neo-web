import request from '@/api/core';
import { Toast } from '@/design-system/components';
import { ADMIN_ID } from '@/utils/constants';
import {
    getQueryResponseErrorMessage,
    getQueryRowsOrThrow,
    type QueryResponseLike,
    getUnknownErrorMessage,
} from '../QueryResponseUtils';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
} from '../sqlBuilder/SqlTextUtils';

const TABLE_SCHEMA_BATCH_SIZE = 50;
const TABLE_SCHEMA_REQUEST_FAILED_MESSAGE = 'Table schema request failed.';
const MALFORMED_TABLE_SCHEMA_MESSAGE = 'Table schema response contained malformed rows.';

export enum MachbaseColumnType {
    Short = 4,
    Varchar = 5,
    DateTime = 6,
    Integer = 8,
    Long = 12,
    Float = 16,
    Double = 20,
    Ipv4 = 32,
    Ipv6 = 36,
    Text = 49,
    Clob = 53,
    Blob = 57,
    Json = 61,
    Binary = 97,
    Ushort = 104,
    Uinteger = 108,
    Ulong = 112,
}

export enum MachbaseColumnFlag {
    None = 0,
    LowLimit = 0x00004000,
    UpperLimit = 0x00008000,
    PrimaryKey = 0x00400000,
    BaseTime = 0x01000000,
    Summarized = 0x02000000,
    MetaColumn = 0x04000000,
    TagName = 0x08000000,
}

export type TableSchemaColumn = {
    name: string;
    type: MachbaseColumnType;
    flag: MachbaseColumnFlag;
};

type TableSchemaTarget = {
    databaseIdQuery: string;
    tableName: string;
    userName: string;
};

type TableSchemaBatchTarget = {
    table: string;
    target: TableSchemaTarget;
};

export async function fetchTableSchema(
    table: string,
): Promise<TableSchemaColumn[]> {
    if (!table) {
        return [];
    }

    try {
        const sSql = buildTableSchemaSql(resolveTableSchemaTarget(table));
        const sRawResponse = await request({
            method: 'GET',
            url: `/api/query?q=${encodeURIComponent(sSql)}`,
        });
        const sResponse = sRawResponse as QueryResponseLike;
        const sErrorMessage = getQueryResponseErrorMessage(
            sResponse,
            TABLE_SCHEMA_REQUEST_FAILED_MESSAGE,
        );

        if (sErrorMessage) {
            Toast.error(sErrorMessage);
            return [];
        }

        return parseTableSchemaRows(
            getQueryRowsOrThrow(sResponse.data, MALFORMED_TABLE_SCHEMA_MESSAGE),
        );
    } catch (error) {
        Toast.error(getUnknownErrorMessage(error, TABLE_SCHEMA_REQUEST_FAILED_MESSAGE));
        return [];
    }
}

export async function fetchTableSchemaBatch(
    tables: string[],
): Promise<Record<string, TableSchemaColumn[]>> {
    const sSchemaByTable: Record<string, TableSchemaColumn[]> = {};
    const sUniqueTables = Array.from(new Set(tables.filter(Boolean)));

    for (let i = 0; i < sUniqueTables.length; i += TABLE_SCHEMA_BATCH_SIZE) {
        const sTableBatch = sUniqueTables.slice(i, i + TABLE_SCHEMA_BATCH_SIZE);
        const sBatchResult = await fetchTableSchemaBatchChunk(sTableBatch);

        Object.assign(sSchemaByTable, sBatchResult);
    }

    return sSchemaByTable;
}

async function fetchTableSchemaBatchChunk(
    tables: string[],
): Promise<Record<string, TableSchemaColumn[]>> {
    if (tables.length === 0) {
        return {};
    }

    try {
        const sTargets = tables.map((table) => ({
            table,
            target: resolveTableSchemaTarget(table),
        }));
        const sSql = buildTableSchemaBatchSql(sTargets);
        const sRawResponse = await request({
            method: 'GET',
            url: `/api/query?q=${encodeURIComponent(sSql)}`,
        });
        const sResponse = sRawResponse as QueryResponseLike;
        const sErrorMessage = getQueryResponseErrorMessage(
            sResponse,
            TABLE_SCHEMA_REQUEST_FAILED_MESSAGE,
        );

        if (sErrorMessage) {
            Toast.error(sErrorMessage);
            return {};
        }

        return {
            ...createEmptySchemaByTable(tables),
            ...parseTableSchemaBatchRows(
                getQueryRowsOrThrow(
                    sResponse.data,
                    MALFORMED_TABLE_SCHEMA_MESSAGE,
                ),
            ),
        };
    } catch (error) {
        Toast.error(getUnknownErrorMessage(error, TABLE_SCHEMA_REQUEST_FAILED_MESSAGE));
        return {};
    }
}

function createEmptySchemaByTable(
    tables: string[],
): Record<string, TableSchemaColumn[]> {
    return Object.fromEntries(tables.map((table) => [table, []]));
}

function resolveTableSchemaTarget(table: string): TableSchemaTarget {
    const sTableParts = table.split('.');

    if (sTableParts.length >= 3) {
        return {
            databaseIdQuery: `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = ${buildSqlStringLiteral(sTableParts[0])})`,
            tableName: buildSqlIdentifierPath(sTableParts.at(-1) ?? '', 'SQL table name'),
            userName: buildSqlIdentifierPath(sTableParts[1], 'SQL user name'),
        };
    }

    if (sTableParts.length === 2) {
        return {
            databaseIdQuery: String(-1),
            tableName: buildSqlIdentifierPath(sTableParts[1], 'SQL table name'),
            userName: buildSqlIdentifierPath(sTableParts[0], 'SQL user name'),
        };
    }

    return {
        databaseIdQuery: String(-1),
        tableName: buildSqlIdentifierPath(table, 'SQL table name'),
        userName: ADMIN_ID.toUpperCase(),
    };
}

function buildTableSchemaSql(target: TableSchemaTarget): string {
    return `SELECT MC.NAME, MC.TYPE, MC.FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER(${buildSqlStringLiteral(target.userName)}) AND MC.DATABASE_ID = ${target.databaseIdQuery} AND MT.NAME = ${buildSqlStringLiteral(target.tableName)} AND MC.NAME <> '_RID' ORDER BY MC.ID`;
}

function buildTableSchemaBatchSql(targets: TableSchemaBatchTarget[]): string {
    const sCaseBranches = targets
        .map(({ table, target }) => (
            `WHEN ${buildTableSchemaTargetCondition(target)} THEN ${buildSqlStringLiteral(table)}`
        ))
        .join(' ');
    const sTargetConditions = targets
        .map(({ target }) => `(${buildTableSchemaTargetCondition(target)})`)
        .join(' OR ');

    return `SELECT CASE ${sCaseBranches} END AS TABLE_KEY, MC.NAME, MC.TYPE, MC.FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MC.NAME <> '_RID' AND (${sTargetConditions}) ORDER BY TABLE_KEY, MC.ID`;
}

function buildTableSchemaTargetCondition(target: TableSchemaTarget): string {
    return `MU.NAME = UPPER(${buildSqlStringLiteral(target.userName)}) AND MC.DATABASE_ID = ${target.databaseIdQuery} AND MT.NAME = ${buildSqlStringLiteral(target.tableName)}`;
}

function parseTableSchemaRows(rows: unknown[]): TableSchemaColumn[] {
    const sColumns: TableSchemaColumn[] = [];

    for (const sRow of rows) {
        const sColumn = parseTableSchemaColumn(sRow);

        if (sColumn) {
            sColumns.push(sColumn);
        }
    }

    return sColumns;
}

function parseTableSchemaBatchRows(
    rows: unknown[],
): Record<string, TableSchemaColumn[]> {
    const sColumnsByTable: Record<string, TableSchemaColumn[]> = {};

    for (const sRow of rows) {
        if (!Array.isArray(sRow) || typeof sRow[0] !== 'string') {
            continue;
        }

        const sColumn = parseTableSchemaColumn(sRow.slice(1, 4));
        if (!sColumn) {
            continue;
        }

        const sTable = sRow[0];
        const sTableColumns = sColumnsByTable[sTable] ?? [];
        sTableColumns.push(sColumn);
        sColumnsByTable[sTable] = sTableColumns;
    }

    return sColumnsByTable;
}

function parseTableSchemaColumn(row: unknown): TableSchemaColumn | undefined {
    if (
        !Array.isArray(row) ||
        typeof row[0] !== 'string' ||
        !Number.isFinite(Number(row[1]))
    ) {
        return undefined;
    }

    return {
        name: row[0],
        type: Number(row[1]) as MachbaseColumnType,
        flag: Number(row[2] ?? 0) as MachbaseColumnFlag,
    };
}
