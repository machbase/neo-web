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
    asset?: Record<string, unknown>;
}

export interface DataViewerAssetHierarchy {
    column: string;
    schema: string[];
    tree?: unknown[];
}

export interface DataViewerTagList {
    tags: DataViewerTag[];
    assetHierarchy?: DataViewerAssetHierarchy;
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

const parseJsonObject = (value: unknown): Record<string, unknown> | undefined => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string' || !value.trim().startsWith('{')) return undefined;

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
};

const normalizeAssetHierarchy = (row: Record<string, unknown>): DataViewerAssetHierarchy | undefined => {
    for (const value of Object.values(row)) {
        const parsed = parseJsonObject(value);
        if (!parsed) continue;
        const schema = Array.isArray(parsed.schema) ? parsed.schema.map((item) => String(item)).filter(Boolean) : [];
        const tree = Array.isArray(parsed.tree) ? parsed.tree : undefined;
        if (schema.length === 0 && !tree) continue;

        return {
            column: String(parsed.column || 'asset').toLowerCase(),
            schema,
            tree,
        };
    }

    return undefined;
};

export async function listTableTags(params: DataViewerTableParams & { tagColumn?: string }): Promise<DataViewerTagList> {
    const metaTable = buildQualifiedMetaTableName(params);
    const tagColumn = normalizeIdentifier(params.tagColumn, 'NAME');
    const { svrState, svrData, svrReason } = await fetchQuery(`select * from ${metaTable} where ${tagColumn} is not null order by _id asc limit 10000`);
    if (!svrState) throw new Error(svrReason || 'Failed to load tags');

    let assetHierarchy: DataViewerAssetHierarchy | undefined;
    const rows = normalizeRows(svrData);
    const tags = rows
        .map((row): DataViewerTag | null => {
            const name = String(row.name ?? row[tagColumn.toLowerCase()] ?? '').trim();
            if (!name) return null;
            if (name === '__machbase_hierarchy__') {
                assetHierarchy = normalizeAssetHierarchy(row);
                return null;
            }

            const assetColumn = assetHierarchy?.column ?? 'asset';
            return {
                name,
                nodeId: name,
                dataType: pickDataTypeValue(row),
                asset: parseJsonObject(row[assetColumn]),
            };
        })
        .filter((tag): tag is DataViewerTag => tag !== null);

    if (assetHierarchy) {
        const hierarchy = assetHierarchy;
        return {
            tags: tags.map((tag) => ({
                ...tag,
                asset: tag.asset ?? parseJsonObject(rows.find((row) => String(row.name ?? '').trim() === tag.name)?.[hierarchy.column]),
            })),
            assetHierarchy: hierarchy,
        };
    }

    return { tags };
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
