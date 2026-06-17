import { fetchQuery, fetchTqlWithoutConsole } from '@/api/repository/database';
import { SQL_BASE_LIMIT } from '@/utils/sqlFormatter';

export interface DataViewerTableParams {
    dbName: string;
    userName: string;
    tableName: string;
}

export interface DataViewerTag {
    name: string;
    nodeId?: string;
    dataType?: string;
}

export interface DataViewerResult {
    rows: Record<string, unknown>[];
    page: number;
    pageSize: number;
}

const escapeSqlString = (value: string) => value.replace(/'/g, "''");
const normalizeIdentifier = (value: string | undefined, fallback: string) => {
    const next = value?.trim() || fallback;
    return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(next) ? next : fallback;
};

export const buildQualifiedTableName = ({ dbName, userName, tableName }: DataViewerTableParams) => `${dbName}.${userName}.${tableName}`;
export const buildQualifiedMetaTableName = ({ dbName, userName, tableName }: DataViewerTableParams) => `${dbName}.${userName}._${tableName}_META`;

const normalizeRows = (data: any): Record<string, unknown>[] => {
    const columns: string[] = data?.columns ?? [];
    const rows: unknown[][] = data?.rows ?? [];
    return rows.map((row: unknown[]) =>
        columns.reduce((acc: Record<string, unknown>, column: string, index: number) => {
            acc[column.toLowerCase()] = row[index];
            return acc;
        }, {})
    );
};

const pickDataTypeValue = (row: Record<string, unknown>) => {
    const dataType = row.data_type ?? row.datatype ?? row.type ?? row.dataType;
    return dataType === null || dataType === undefined ? undefined : String(dataType);
};

export async function listTableTags(params: DataViewerTableParams & { tagColumn?: string }): Promise<DataViewerTag[]> {
    const metaTable = buildQualifiedMetaTableName(params);
    const tagColumn = normalizeIdentifier(params.tagColumn, 'NAME');
    const { svrState, svrData, svrReason } = await fetchQuery(`select * from ${metaTable} where ${tagColumn} is not null order by _id asc limit 10000`);
    if (!svrState) throw new Error(svrReason || 'Failed to load tags');

    return normalizeRows(svrData)
        .map((row) => {
            const name = String(row[tagColumn.toLowerCase()] ?? row.name ?? '');
            return {
                name,
                nodeId: name,
                dataType: pickDataTypeValue(row),
            };
        })
        .filter((tag) => tag.name !== '');
}

export async function queryTagData({
    dbName,
    userName,
    tableName,
    name,
    direction,
    from,
    to,
    page,
    pageSize = SQL_BASE_LIMIT,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    valueColumn = 'VALUE',
}: DataViewerTableParams & {
    name: string;
    direction: 'latest' | 'oldest';
    from?: string;
    to?: string;
    page: number;
    pageSize?: number;
    tagColumn?: string;
    timeColumn?: string;
    valueColumn?: string;
}): Promise<DataViewerResult> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const tagColumnExpr = normalizeIdentifier(tagColumn, 'NAME');
    const timeColumnExpr = normalizeIdentifier(timeColumn, 'TIME');
    const valueColumnExpr = normalizeIdentifier(valueColumn, 'VALUE');
    const where = [`${tagColumnExpr} = '${escapeSqlString(name)}'`];
    if (from && from !== 'last' && from !== 'now') where.push(`${timeColumnExpr} >= TO_TIMESTAMP('${escapeSqlString(from)}')`);
    if (to && to !== 'last' && to !== 'now') where.push(`${timeColumnExpr} <= TO_TIMESTAMP('${escapeSqlString(to)}')`);
    const offset = Math.max(0, page - 1) * pageSize;
    const order = direction === 'latest' ? 'desc' : 'asc';
    const sql = `select ${timeColumnExpr} as time, ${tagColumnExpr} as name, ${valueColumnExpr} as value from ${table} where ${where.join(' and ')} order by ${timeColumnExpr} ${order} limit ${offset}, ${pageSize}`;
    const { svrState, svrData, svrReason } = await fetchTqlWithoutConsole(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load data');

    return {
        rows: normalizeRows(svrData),
        page,
        pageSize,
    };
}
