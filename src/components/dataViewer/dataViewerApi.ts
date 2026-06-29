import { fetchQuery } from '@/api/repository/database';
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
    total?: number;
}

export interface DataViewerTotalResult {
    total: number;
    pageSize: number;
    lastPage: number;
}

const escapeSqlString = (value: string) => value.replace(/'/g, "''");
const normalizeIdentifier = (value: string | undefined, fallback: string) => {
    const next = value?.trim() || fallback;
    return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(next) ? next : fallback;
};
const formatMachbaseTimestamp = (value: string) => {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) return text;

    const parsed = Date.parse(text);
    if (!Number.isFinite(parsed)) return text;

    const iso = new Date(parsed).toISOString();
    return iso.replace('T', ' ').replace('Z', '');
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

const normalizeChartSeriesRows = (data: any): unknown[][] => {
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
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

const buildTagDataWhere = ({
    names,
    from,
    to,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
}: {
    names: string[];
    from?: string;
    to?: string;
    tagColumn?: string;
    timeColumn?: string;
}) => {
    const tagColumnExpr = normalizeIdentifier(tagColumn, 'NAME');
    const timeColumnExpr = normalizeIdentifier(timeColumn, 'TIME');
    const normalizedNames = (Array.isArray(names) ? names : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean);
    const where =
        normalizedNames.length > 1
            ? [`${tagColumnExpr} in (${normalizedNames.map((name) => `'${escapeSqlString(name)}'`).join(', ')})`]
            : [`${tagColumnExpr} = '${escapeSqlString(normalizedNames[0] || '')}'`];
    if (from && from !== 'last' && from !== 'now') where.push(`${timeColumnExpr} >= TO_TIMESTAMP('${escapeSqlString(formatMachbaseTimestamp(from))}')`);
    if (to && to !== 'last' && to !== 'now') where.push(`${timeColumnExpr} <= TO_TIMESTAMP('${escapeSqlString(formatMachbaseTimestamp(to))}')`);
    return {
        tagColumnExpr,
        timeColumnExpr,
        where,
    };
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
    names,
    direction,
    from,
    to,
    page,
    pageSize = SQL_BASE_LIMIT,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    valueColumn = 'VALUE',
}: DataViewerTableParams & {
    names: string[];
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
    const valueColumnExpr = normalizeIdentifier(valueColumn, 'VALUE');
    const { tagColumnExpr, timeColumnExpr, where } = buildTagDataWhere({ names, from, to, tagColumn, timeColumn });
    const offset = Math.max(0, page - 1) * pageSize;
    const order = direction === 'latest' ? 'desc' : 'asc';
    const sql = `select ${timeColumnExpr} as time, ${tagColumnExpr} as name, ${valueColumnExpr} as value from ${table} where ${where.join(' and ')} order by ${timeColumnExpr} ${order} limit ${offset}, ${pageSize}`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load data');

    return {
        rows: normalizeRows(svrData),
        page,
        pageSize,
    };
}

export async function queryTagDataTotal({
    dbName,
    userName,
    tableName,
    names,
    from,
    to,
    pageSize = SQL_BASE_LIMIT,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
}: DataViewerTableParams & {
    names: string[];
    from?: string;
    to?: string;
    pageSize?: number;
    tagColumn?: string;
    timeColumn?: string;
}): Promise<DataViewerTotalResult> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const { where } = buildTagDataWhere({ names, from, to, tagColumn, timeColumn });
    const sql = `select count(*) as row_count from ${table} where ${where.join(' and ')}`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to calculate end page');

    const row = normalizeRows(svrData)[0] || {};
    const total = Number(row.row_count ?? row.count ?? Object.values(row)[0] ?? 0);
    const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
    const safePageSize = Math.max(1, Math.floor(pageSize));
    return {
        total: safeTotal,
        pageSize: safePageSize,
        lastPage: Math.max(1, Math.ceil(safeTotal / safePageSize)),
    };
}

export async function queryTagBoundaryTime({
    dbName,
    userName,
    tableName,
    names,
    direction,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
}: DataViewerTableParams & {
    names: string[];
    direction: 'latest' | 'oldest';
    tagColumn?: string;
    timeColumn?: string;
}): Promise<unknown> {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const tagColumnExpr = normalizeIdentifier(tagColumn, 'NAME');
    const timeColumnExpr = normalizeIdentifier(timeColumn, 'TIME');
    const normalizedNames = (Array.isArray(names) ? names : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean);
    const tagCondition =
        normalizedNames.length > 1
            ? `${tagColumnExpr} in (${normalizedNames.map((name) => `'${escapeSqlString(name)}'`).join(', ')})`
            : `${tagColumnExpr} = '${escapeSqlString(normalizedNames[0] || '')}'`;
    const order = direction === 'latest' ? 'desc' : 'asc';
    const sql = `select ${timeColumnExpr} as time from ${table} where ${tagCondition} order by ${timeColumnExpr} ${order} limit 1`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load time range base');

    return normalizeRows(svrData)[0]?.time;
}

function toEpochMs(value: unknown) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return Number.NaN;
        if (Math.abs(value) > 100000000000000) return value / 1000000;
        return value;
    }

    const text = String(value ?? '').trim();
    if (!text) return Number.NaN;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) return toEpochMs(numeric);
    return Date.parse(text);
}

export function buildSeriesFromChartRows(rows: unknown[][] = []) {
    const seriesByName = new Map<string, Array<[number, number | null]>>();

    rows.forEach((row) => {
        if (!Array.isArray(row) || row.length < 3) return;
        const x = toEpochMs(row[0]);
        const name = String(row[1] ?? '').trim();
        const y = row[2] === null || row[2] === '' ? null : Number(row[2]);
        if (!name || !Number.isFinite(x)) return;
        if (y !== null && !Number.isFinite(y)) return;
        if (!seriesByName.has(name)) seriesByName.set(name, []);
        seriesByName.get(name)?.push([x, y]);
    });

    return Array.from(seriesByName.entries()).map(([name, data]) => ({
        name,
        data: data.sort((a, b) => a[0] - b[0]),
    }));
}

export async function queryTagChartData({
    dbName,
    userName,
    tableName,
    names,
    from,
    to,
    tagColumn = 'NAME',
    timeColumn = 'TIME',
    valueColumn = 'VALUE',
}: DataViewerTableParams & {
    names: string[];
    from?: string;
    to?: string;
    tagColumn?: string;
    timeColumn?: string;
    valueColumn?: string;
}) {
    const table = buildQualifiedTableName({ dbName, userName, tableName });
    const valueColumnExpr = normalizeIdentifier(valueColumn, 'VALUE');
    const { tagColumnExpr, timeColumnExpr, where } = buildTagDataWhere({ names, from, to, tagColumn, timeColumn });
    const sql = `select ${timeColumnExpr} as time, ${tagColumnExpr} as name, ${valueColumnExpr} as value from ${table} where ${where.join(' and ')} order by ${timeColumnExpr} asc`;
    const { svrState, svrData, svrReason } = await fetchQuery(sql);
    if (!svrState) throw new Error(svrReason || 'Failed to load chart data');
    const rows = normalizeChartSeriesRows(svrData);
    return {
        query: sql,
        rows,
        series: buildSeriesFromChartRows(rows),
    };
}
