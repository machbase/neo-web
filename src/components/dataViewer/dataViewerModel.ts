export const DEFAULT_TIME_FORMAT = '2006-01-02 15:04:05.000';
export const DEFAULT_TIME_ZONE = 'LOCAL';

export const TIME_FORMATS = [
    { label: 'TIMESTAMP(ns)', value: 'ns' },
    { label: 'TIMESTAMP(us)', value: 'us' },
    { label: 'TIMESTAMP(ms)', value: 'ms' },
    { label: 'TIMESTAMP(s)', value: 's' },
    { label: 'YYYY-MM-DD', value: '2006-01-02' },
    { label: 'YYYY-MM-DD HH:MI:SS', value: '2006-01-02 15:04:05' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSS', value: '2006-01-02 15:04:05.000' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSSSSS', value: '2006-01-02 15:04:05.000000' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSSSSSSSS', value: '2006-01-02 15:04:05.000000000' },
    { label: 'HH:MI:SS', value: '03:04:05' },
];

const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
const supportedTimeZones: string[] = typeof Intl !== 'undefined' && typeof supportedValuesOf === 'function' ? supportedValuesOf('timeZone') : [];

export const TIME_ZONE_OPTIONS = [
    { value: 'UTC', label: 'UTC' },
    { value: 'LOCAL', label: 'LOCAL' },
    ...supportedTimeZones.filter((zone) => zone !== 'UTC').map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') })),
];

export const QUICK_TIME_RANGE_GROUPS = [
    [
        { key: 'now-5s', name: 'Last 5 seconds', value: ['now-5s', 'now'] },
        { key: 'now-10s', name: 'Last 10 seconds', value: ['now-10s', 'now'] },
        { key: 'now-5m', name: 'Last 5 minutes', value: ['now-5m', 'now'] },
        { key: 'now-10m', name: 'Last 10 minutes', value: ['now-10m', 'now'] },
        { key: 'now-1h', name: 'Last 1 hour', value: ['now-1h', 'now'] },
        { key: 'now-1d', name: 'Last 1 days', value: ['now-1d', 'now'] },
    ],
    [
        { key: 'last-5s', name: 'Last 5 seconds of data', value: ['last-5s', 'last'] },
        { key: 'last-10s', name: 'Last 10 seconds of data', value: ['last-10s', 'last'] },
        { key: 'last-5m', name: 'Last 5 minutes of data', value: ['last-5m', 'last'] },
        { key: 'last-10m', name: 'Last 10 minutes of data', value: ['last-10m', 'last'] },
        { key: 'last-1h', name: 'Last 1 hour of data', value: ['last-1h', 'last'] },
        { key: 'last-1d', name: 'Last 1 days of data', value: ['last-1d', 'last'] },
    ],
];

export function getTimeFormatLabel(value: string) {
    return TIME_FORMATS.find((option) => option.value === value)?.label || value;
}

export function getTimeZoneLabel(value: string) {
    return TIME_ZONE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function buildDataViewerHeaderLabels(jobName: string | undefined, tableName: string | undefined) {
    const job = String(jobName || '').trim();
    const table = String(tableName || '').trim();
    return {
        title: job || table,
        detail: table,
    };
}

export function getScanDirectionLabel(backwardScan: boolean) {
    return backwardScan ? 'Backward' : 'Forward';
}

export function formatTimeRangeLabel(from: string, to: string) {
    if (!from && !to) return 'Time range not set';
    return `${from || 'Start'} ~ ${to || 'End'}`;
}

export function resolveTimeRangeInput(value: string, baseDate = new Date()) {
    const text = value.trim();
    if (!text) return '';
    if (text === 'now' || text === 'last') return text;

    const relative = text.match(/^(now|last)-(\d+)(s|m|h|d|M|y)$/);
    if (relative) {
        const amount = Number(relative[2]);
        const unit = relative[3];
        const date = new Date(baseDate);
        if (unit === 's') date.setSeconds(date.getSeconds() - amount);
        if (unit === 'm') date.setMinutes(date.getMinutes() - amount);
        if (unit === 'h') date.setHours(date.getHours() - amount);
        if (unit === 'd') date.setDate(date.getDate() - amount);
        if (unit === 'M') date.setMonth(date.getMonth() - amount);
        if (unit === 'y') date.setFullYear(date.getFullYear() - amount);
        return formatDateTimeForSql(date);
    }

    const parsed = new Date(text.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return null;
    return text;
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

export function buildTagChartSeries(rows: Record<string, unknown>[] = []) {
    const seriesByName = new Map<string, [number, number][]>();

    rows.forEach((row) => {
        const name = String(row?.name ?? '');
        const x = toEpochMs(row?.time);
        const y = Number(row?.value);
        if (!name || !Number.isFinite(x) || !Number.isFinite(y)) return;
        if (!seriesByName.has(name)) {
            seriesByName.set(name, []);
        }
        seriesByName.get(name)?.push([x, y]);
    });

    return Array.from(seriesByName.entries()).map(([name, data]) => ({
        name,
        data: data.sort((a, b) => a[0] - b[0]),
    }));
}

export type DataViewerTreeRow =
    | {
          type: 'folder';
          id: string;
          label: string;
          depth: number;
          path: string[];
          parentIds: string[];
      }
    | {
          type: 'tag';
          id: string;
          label: string;
          depth: number;
          name: string;
          dataType?: string;
          parentIds: string[];
      };

export function filterDataViewerTags<T extends { name: string; dataType?: string }>(tags: T[], filter: string) {
    const q = filter.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(q) || tag.dataType?.toLowerCase().includes(q));
}

export function buildAssetTreeRows(
    tags: Array<{ name: string; dataType?: string; asset?: Record<string, unknown> }>,
    assetHierarchy: { schema?: string[]; tree?: unknown[] } | undefined,
    filter: string,
): DataViewerTreeRow[] {
    const schema = Array.isArray(assetHierarchy?.schema) ? assetHierarchy.schema.map((key) => String(key).trim()).filter(Boolean) : [];
    const tree = Array.isArray(assetHierarchy?.tree) ? assetHierarchy.tree : [];
    if (schema.length === 0 || tree.length === 0) return [];

    const q = filter.trim().toLowerCase();
    const rows: DataViewerTreeRow[] = [];
    const assetPathKey = (parts: Array<{ key: string; value: string }>) => parts.map((part) => `${part.key}=${part.value}`).join('/');
    const folderIdForPath = (path: Array<{ key: string; value: string }>) => `asset-folder:${assetPathKey(path)}`;

    const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
    const collectFolders = (nodes: unknown[], path: Array<{ key: string; value: string }> = [], depth = 0, folders = new Map<string, unknown>()) => {
        if (!Array.isArray(nodes) || depth >= schema.length) return folders;
        nodes.forEach((node) => {
            if (!isRecord(node)) return;
            const key = String(node.key || '').trim();
            const value = String(node.value || '').trim();
            if (!key || !value || key !== schema[depth]) return;
            const nextPath = [...path, { key, value }];
            folders.set(assetPathKey(nextPath), node);
            collectFolders(Array.isArray(node.children) ? node.children : [], nextPath, depth + 1, folders);
        });
        return folders;
    };

    const folders = collectFolders(tree);
    const deepestFolderKey = (asset: Record<string, unknown> | undefined) => {
        if (!asset) return '';
        const path: Array<{ key: string; value: string }> = [];
        let deepest = '';
        let deepestNode: unknown = null;

        for (const key of schema) {
            const value = String(asset[key] ?? '').trim();
            if (!value) break;
            path.push({ key, value });
            const folderKey = assetPathKey(path);
            if (!folders.has(folderKey)) {
                return isRecord(deepestNode) && Array.isArray(deepestNode.children) && deepestNode.children.length > 0 ? '' : deepest;
            }
            deepest = folderKey;
            deepestNode = folders.get(folderKey);
        }

        return deepest;
    };

    const tagsByFolder = new Map<string, Array<{ name: string; dataType?: string }>>();
    tags.forEach((tag) => {
        const folderKey = deepestFolderKey(tag.asset);
        if (!folderKey) return;
        const pathText = folderKey.toLowerCase();
        const searchable = [tag.name, tag.dataType, pathText].filter(Boolean).join(' ').toLowerCase();
        if (q && !searchable.includes(q)) return;
        if (!tagsByFolder.has(folderKey)) tagsByFolder.set(folderKey, []);
        tagsByFolder.get(folderKey)?.push({ name: tag.name, dataType: tag.dataType });
    });

    const walk = (nodes: unknown[], path: Array<{ key: string; value: string }> = [], depth = 0) => {
        if (!Array.isArray(nodes) || depth >= schema.length) return;
        nodes.forEach((node) => {
            if (!isRecord(node)) return;
            const key = String(node.key || '').trim();
            const value = String(node.value || '').trim();
            if (!key || !value || key !== schema[depth]) return;
            const nextPath = [...path, { key, value }];
            const folderKey = assetPathKey(nextPath);
            const parentIds = nextPath.slice(0, -1).map((_, index) => folderIdForPath(nextPath.slice(0, index + 1)));
            rows.push({
                type: 'folder',
                id: folderIdForPath(nextPath),
                label: value,
                depth,
                path: nextPath.map((part) => part.value),
                parentIds,
            });

            (tagsByFolder.get(folderKey) || []).forEach((tag) => {
                rows.push({
                    type: 'tag',
                    id: `asset-tag:${folderKey}:${tag.name}`,
                    label: tag.name,
                    depth: depth + 1,
                    name: tag.name,
                    dataType: tag.dataType,
                    parentIds: [...parentIds, folderIdForPath(nextPath)],
                });
            });

            walk(Array.isArray(node.children) ? node.children : [], nextPath, depth + 1);
        });
    };

    walk(tree);

    return rows;
}

export function filterVisibleAssetRows(rows: DataViewerTreeRow[], collapsedFolderIds: Set<string>) {
    if (collapsedFolderIds.size === 0) return rows;
    return rows.filter((row) => !row.parentIds.some((id) => collapsedFolderIds.has(id)));
}

export function formatDataViewerTime(value: unknown, timeFormat: string, timeZone: string) {
    if (value === null || value === undefined || value === '') return '';
    if (timeFormat === 'ns' || timeFormat === 'us' || timeFormat === 'ms' || timeFormat === 's') return String(value);

    const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    const date = Number.isFinite(numeric) ? new Date(numeric > 1_000_000_000_000_000 ? numeric / 1_000_000 : numeric) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);

    const zone = timeZone === 'LOCAL' ? undefined : timeZone;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
        .formatToParts(date)
        .reduce<Record<string, string>>((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

    const base = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    if (!timeFormat.includes('.')) return base;
    return `${base}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function formatDateTimeForSql(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
