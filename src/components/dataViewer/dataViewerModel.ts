export const DEFAULT_TIME_FORMAT = '2006-01-02 15:04:05.000';
export const DEFAULT_TIME_ZONE = 'LOCAL';

export const TIME_FORMATS = [
    { label: 'TIMESTAMP(ns)', value: 'ns' },
    { label: 'TIMESTAMP(us)', value: 'us' },
    { label: 'TIMESTAMP(ms)', value: 'ms' },
    { label: 'TIMESTAMP(s)', value: 's' },
    { label: 'YYYY-MM-DD', value: '2006-01-02' },
    { label: 'YYYY-DD-MM', value: '2006-02-01' },
    { label: 'DD-MM-YYYY', value: '02-01-2006' },
    { label: 'MM-DD-YYYY', value: '01-02-2006' },
    { label: 'YY-DD-MM', value: '06-02-01' },
    { label: 'YY-MM-DD', value: '06-01-02' },
    { label: 'MM-DD-YY', value: '01-02-06' },
    { label: 'DD-MM-YY', value: '02-01-06' },
    { label: 'YYYY-MM-DD HH:MI:SS', value: '2006-01-02 15:04:05' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSS', value: '2006-01-02 15:04:05.000' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSSSSS', value: '2006-01-02 15:04:05.000000' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSSSSSSSS', value: '2006-01-02 15:04:05.000000000' },
    { label: 'YYYY-MM-DD HH', value: '2006-01-02 15' },
    { label: 'YYYY-MM-DD HH:MI', value: '2006-01-02 15:04' },
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
        detail: job && table ? table : '',
    };
}

const RAW_COLUMN_ORDER = ['time', 'name', 'value'];
const INTERNAL_RAW_RESULT_KEYS = new Set(['buffer', 'names']);

function formatRawColumnLabel(key: string) {
    return String(key || '')
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

export function buildRawResultColumns(rows: Record<string, unknown>[] = [], options: { hiddenKeys?: string[]; hideAssetMetadata?: boolean } = {}) {
    const keys: string[] = [];
    const seen = new Set<string>();
    const hiddenKeys = new Set(
        (options.hiddenKeys || [])
            .map((key) => String(key || '').trim().toLowerCase())
            .filter(Boolean),
    );
    if (options.hideAssetMetadata) hiddenKeys.add('asset');

    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        for (const key of Object.keys(row)) {
            const normalizedKey = String(key).toLowerCase();
            if (INTERNAL_RAW_RESULT_KEYS.has(normalizedKey)) continue;
            if (hiddenKeys.has(normalizedKey)) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            keys.push(key);
        }
    }

    const orderedKeys =
        keys.length > 0 ? [...RAW_COLUMN_ORDER.filter((key) => seen.has(key)), ...keys.filter((key) => !RAW_COLUMN_ORDER.includes(key))] : RAW_COLUMN_ORDER;

    return orderedKeys.map((key) => ({
        key,
        label: formatRawColumnLabel(key),
    }));
}

export function getScanDirectionLabel(backwardScan: boolean) {
    return backwardScan ? 'Backward' : 'Forward';
}

export function formatTimeRangeLabel(from: unknown, to: unknown) {
    if (!from && !to) return 'Time range not set';
    return `${formatTimeRangeBoundaryLabel(from, 'Start')} ~ ${formatTimeRangeBoundaryLabel(to, 'End')}`;
}

function formatTimeRangeBoundaryLabel(value: unknown, fallback: string) {
    if (!value) return fallback;
    if (typeof value !== 'number') return String(value);
    if (!Number.isFinite(value)) return fallback;
    return formatDateTimeForSql(new Date(value));
}

export function resolveTimeRangeInput(value: unknown, baseDate = new Date()) {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return formatDateTimeForSql(new Date(value));
    }

    const text = String(value ?? '').trim();
    if (!text) return '';
    if (text === 'now' || text === 'last') return formatDateTimeForSql(baseDate);

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

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function chooseTimeTickInterval(duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return undefined;
    if (duration <= 10 * SECOND_MS) return SECOND_MS;
    if (duration <= MINUTE_MS) return 10 * SECOND_MS;
    if (duration <= 5 * MINUTE_MS) return MINUTE_MS;
    if (duration <= 10 * MINUTE_MS) return 2 * MINUTE_MS;
    if (duration <= HOUR_MS) return 10 * MINUTE_MS;
    if (duration <= 3 * HOUR_MS) return 30 * MINUTE_MS;
    if (duration <= DAY_MS) return 3 * HOUR_MS;
    if (duration <= 3 * DAY_MS) return 12 * HOUR_MS;
    if (duration <= 31 * DAY_MS) return 7 * DAY_MS;
    if (duration <= 366 * DAY_MS) return 30 * DAY_MS;
    return 90 * DAY_MS;
}

export function buildDataViewerChartXAxis(points: Array<[number, number] | { x?: number }> = [], range: { from?: unknown; to?: unknown } = {}) {
    const pointTimes = points
        .map((point) => (Array.isArray(point) ? point[0] : point?.x))
        .filter((value): value is number => Number.isFinite(value));
    const rangeFrom = toEpochMs(range.from);
    const rangeTo = toEpochMs(range.to);

    let min = Number.isFinite(rangeFrom) ? rangeFrom : undefined;
    let max = Number.isFinite(rangeTo) ? rangeTo : undefined;

    if (min === undefined && pointTimes.length > 0) min = Math.min(...pointTimes);
    if (max === undefined && pointTimes.length > 0) max = Math.max(...pointTimes);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return {};
    let axisMin = Number(min);
    let axisMax = Number(max);

    if (axisMin > axisMax) {
        const tmp = axisMin;
        axisMin = axisMax;
        axisMax = tmp;
    }

    return {
        min: axisMin,
        max: axisMax,
        tickInterval: chooseTimeTickInterval(axisMax - axisMin),
    };
}

export function toDataViewerDate(value: unknown): Date | null {
    const epochMs = toEpochMs(value);
    if (!Number.isFinite(epochMs)) return null;
    const date = new Date(epochMs);
    return Number.isNaN(date.getTime()) ? null : date;
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
    if (timeFormat === '03:04:05') return `${parts.hour}:${parts.minute}:${parts.second}`;
    if (timeFormat === '2006-01-02') return `${parts.year}-${parts.month}-${parts.day}`;
    if (timeFormat === '2006-01-02 15:04') return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    if (!timeFormat.includes('.')) return base;
    return `${base}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

export function formatDataViewerAxisTime(value: unknown, range: { min?: unknown; max?: unknown; from?: unknown; to?: unknown } = {}, timeZone = DEFAULT_TIME_ZONE) {
    const startTime = toEpochMs(range.min ?? range.from);
    const endTime = toEpochMs(range.max ?? range.to);
    const span = Number.isFinite(startTime) && Number.isFinite(endTime) ? endTime - startTime : 0;

    if (span <= HOUR_MS) {
        return formatDataViewerTime(value, '03:04:05', timeZone);
    }

    if (span <= DAY_MS) {
        return formatDataViewerTime(value, '2006-01-02 15:04', timeZone).slice(11);
    }

    if (span <= 30 * DAY_MS) {
        return formatDataViewerTime(value, '2006-01-02 15:04', timeZone).slice(5);
    }

    return formatDataViewerTime(value, '2006-01-02', timeZone);
}

function formatDateTimeForSql(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
