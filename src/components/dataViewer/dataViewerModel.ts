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
        { key: 'now-3h', name: 'Last 3 hour', value: ['now-3h', 'now'] },
        { key: 'now-1d', name: 'Last 1 days', value: ['now-1d', 'now'] },
        { key: 'now-3d', name: 'Last 3 days', value: ['now-3d', 'now'] },
        { key: 'now-1M', name: 'Last 1 months', value: ['now-1M', 'now'] },
        { key: 'now-1y', name: 'Last 1 year', value: ['now-1y', 'now'] },
    ],
    [
        { key: 'last-5s', name: 'Last 5 seconds of data', value: ['last-5s', 'last'] },
        { key: 'last-10s', name: 'Last 10 seconds of data', value: ['last-10s', 'last'] },
        { key: 'last-5m', name: 'Last 5 minutes of data', value: ['last-5m', 'last'] },
        { key: 'last-10m', name: 'Last 10 minutes of data', value: ['last-10m', 'last'] },
        { key: 'last-1h', name: 'Last 1 hour of data', value: ['last-1h', 'last'] },
        { key: 'last-3h', name: 'Last 3 hour of data', value: ['last-3h', 'last'] },
        { key: 'last-1d', name: 'Last 1 days of data', value: ['last-1d', 'last'] },
        { key: 'last-3d', name: 'Last 3 days of data', value: ['last-3d', 'last'] },
        { key: 'last-1M', name: 'Last 1 months of data', value: ['last-1M', 'last'] },
        { key: 'last-1y', name: 'Last 1 year of data', value: ['last-1y', 'last'] },
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

export function shouldFetchDataViewerRowsForMode(mode: unknown) {
    return mode === 'raw' || mode === 'chart';
}

export function getDataViewerRawPageSize(selectedTagNames: unknown[] = []) {
    const tagCount = Array.isArray(selectedTagNames) ? selectedTagNames.length : 0;
    return Math.max(1, tagCount) * 1000;
}

function getRawRowTimeValue(row: unknown) {
    if (Array.isArray(row)) return row[0];
    if (!row || typeof row !== 'object') return undefined;
    const record = row as Record<string, unknown>;
    return record.time ?? record.TIME ?? record.Time;
}

function getRawRowNameValue(row: unknown) {
    if (Array.isArray(row)) return row[1];
    if (!row || typeof row !== 'object') return undefined;
    const record = row as Record<string, unknown>;
    return record.name ?? record.NAME ?? record.Name;
}

function getRawRowValueValue(row: unknown) {
    if (Array.isArray(row)) return row[2];
    if (!row || typeof row !== 'object') return undefined;
    const record = row as Record<string, unknown>;
    return record.value ?? record.VALUE ?? record.Value;
}

export function buildDataViewerRawPageTimeRange(rows: unknown[] = []): { from: string; to: string } | null {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    rows.forEach((row) => {
        const epochMs = toEpochMs(getRawRowTimeValue(row));
        if (!Number.isFinite(epochMs)) return;
        if (epochMs < min) min = epochMs;
        if (epochMs > max) max = epochMs;
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

    return {
        from: new Date(min).toISOString(),
        to: new Date(max).toISOString(),
    };
}

export type DataViewerRawPageBounds = {
    pageStart: { time: string; name: string };
    pageEnd: { time: string; name: string };
    pageBounds: { from: string; to: string };
};

export type DataViewerRawPageRequest =
    | { page: number; from: string; to: string; boundedRange: true; cursorSide?: undefined; cursorTime?: undefined; cursorName?: undefined; cursorOffset?: undefined }
    | { page: number; from?: undefined; to?: undefined; boundedRange?: undefined; cursorSide?: undefined; cursorTime?: undefined; cursorName?: undefined; cursorOffset?: undefined }
    | { page: number; from?: undefined; to?: undefined; boundedRange?: undefined; cursorSide: 'next' | 'prev'; cursorTime: string; cursorName: string; cursorOffset: number };

export function buildDataViewerRawPageBounds(rows: unknown[] = []): DataViewerRawPageBounds | null {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const normalized = rows
        .map((row) => {
            const epochMs = toEpochMs(getRawRowTimeValue(row));
            if (!Number.isFinite(epochMs)) return null;
            return {
                time: new Date(epochMs).toISOString(),
                name: String(getRawRowNameValue(row) ?? ''),
                epochMs,
            };
        })
        .filter((row): row is { time: string; name: string; epochMs: number } => Boolean(row));

    if (normalized.length === 0) return null;

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    normalized.forEach((row) => {
        if (row.epochMs < min) min = row.epochMs;
        if (row.epochMs > max) max = row.epochMs;
    });

    return {
        pageStart: {
            time: normalized[0].time,
            name: normalized[0].name,
        },
        pageEnd: {
            time: normalized[normalized.length - 1].time,
            name: normalized[normalized.length - 1].name,
        },
        pageBounds: {
            from: new Date(min).toISOString(),
            to: new Date(max).toISOString(),
        },
    };
}

export function buildDataViewerRawPageRequest({
    currentPage = 1,
    nextPage = 1,
    pageSize = 1,
    currentBounds,
    reason = 'page',
}: {
    currentPage?: number;
    nextPage?: number;
    pageSize?: number;
    currentBounds?: DataViewerRawPageBounds | null;
    reason?: 'page' | 'tags';
} = {}): DataViewerRawPageRequest {
    const page = Math.max(1, Math.floor(Number(nextPage) || 1));
    const previousPage = Math.max(1, Math.floor(Number(currentPage) || 1));
    const safePageSize = Math.max(1, Math.floor(Number(pageSize) || 1));

    if (reason === 'tags' && currentBounds?.pageBounds) {
        return {
            page,
            from: currentBounds.pageBounds.from,
            to: currentBounds.pageBounds.to,
            boundedRange: true,
        };
    }

    if (!currentBounds || page === previousPage) {
        return { page };
    }

    if (Math.abs(page - previousPage) !== 1) {
        return { page };
    }

    const movingForward = page > previousPage;
    const boundary = movingForward ? currentBounds.pageEnd : currentBounds.pageStart;
    if (!boundary?.time) return { page };

    return {
        page,
        cursorSide: movingForward ? 'next' : 'prev',
        cursorTime: boundary.time,
        cursorName: boundary.name || '',
        cursorOffset: Math.max(0, Math.abs(page - previousPage) - 1) * safePageSize,
    };
}

export function hasDataViewerRawNextPage({
    rowCount = 0,
    pageSize = 1,
    forceOpen = false,
}: {
    rowCount?: number;
    pageSize?: number;
    forceOpen?: boolean;
} = {}) {
    if (forceOpen) return true;
    const safePageSize = Math.max(1, Math.floor(Number(pageSize) || 1));
    return Math.max(0, Math.floor(Number(rowCount) || 0)) >= safePageSize;
}

export function buildDataViewerRawToChartRangeUpdate({
    rows = [],
    rawRange = { from: '', to: '' },
    splitGroups = [],
}: {
    rows?: unknown[];
    rawRange?: { from?: unknown; to?: unknown };
    splitGroups?: Array<{ id?: string; [key: string]: unknown }>;
} = {}) {
    const chartRange = buildDataViewerRawPageTimeRange(rows);
    if (!chartRange) return null;

    const splitRanges: Record<string, { from: string; to: string }> = {};
    splitGroups.forEach((group) => {
        if (group?.id) splitRanges[group.id] = chartRange;
    });

    return {
        rawRange,
        chartRange,
        splitRanges,
    };
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
        const name = String(getRawRowNameValue(row) ?? '');
        const x = toEpochMs(getRawRowTimeValue(row));
        const y = Number(getRawRowValueValue(row));
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

export function buildDataViewerChartResultsFromRawRows({
    rows = [],
    rowsByGroup = {},
    chartGroups = [],
}: {
    rows?: Record<string, unknown>[];
    rowsByGroup?: Record<string, Record<string, unknown>[]>;
    chartGroups?: DataViewerChartGroup[];
} = {}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeRowsByGroup = rowsByGroup && typeof rowsByGroup === 'object' ? rowsByGroup : {};
    const results: Record<string, { range: { from?: unknown; to?: unknown }; series: ReturnType<typeof buildTagChartSeries> }> = {};

    chartGroups.forEach((group) => {
        if (!group?.id) return;
        const sourceRows = Array.isArray(safeRowsByGroup[group.id]) ? safeRowsByGroup[group.id] : safeRows;
        const tagSet = new Set((group.tagNames || []).map((name) => String(name || '').trim()).filter(Boolean));
        const groupRows = tagSet.size > 0 ? sourceRows.filter((row) => tagSet.has(String(getRawRowNameValue(row) ?? ''))) : [];
        results[group.id] = {
            range: group.range || { from: '', to: '' },
            series: buildTagChartSeries(groupRows),
        };
    });

    return results;
}

export type DataViewerChartGroup = {
    id: string;
    title: string;
    tagNames: string[];
    range: { from?: unknown; to?: unknown };
    split: boolean;
};

export type DataViewerSplitGroup = {
    id: string;
    title: string;
    tagNames: string[];
};

export type DataViewerChartRangeMs = {
    startTime?: number;
    endTime?: number;
};

type DataViewerChartStoredRange = DataViewerChartRangeMs & {
    from?: unknown;
    to?: unknown;
    start?: unknown;
    end?: unknown;
};

export function buildDataViewerChartGroups({
    selectedTagNames = [],
    splitGroups = [],
    splitTagNames = [],
    globalRange = { from: '', to: '' },
    splitRanges = {},
}: {
    selectedTagNames?: string[];
    splitGroups?: DataViewerSplitGroup[];
    splitTagNames?: string[];
    globalRange?: { from?: unknown; to?: unknown };
    splitRanges?: Record<string, { from?: unknown; to?: unknown }>;
} = {}): DataViewerChartGroup[] {
    const selected: string[] = [];
    const selectedSet = new Set<string>();
    selectedTagNames.forEach((name) => {
        const tagName = String(name || '').trim();
        if (!tagName || selectedSet.has(tagName)) return;
        selectedSet.add(tagName);
        selected.push(tagName);
    });

    const normalizedSplitGroups: DataViewerSplitGroup[] = [];
    const splitSet = new Set<string>();
    const sourceSplitGroups = splitGroups.length > 0 ? splitGroups : splitTagNames.map((name) => ({ id: `split:${name}`, title: name, tagNames: [name] }));

    sourceSplitGroups.forEach((group) => {
        const groupNames: string[] = [];
        (group?.tagNames || []).forEach((name) => {
            const tagName = String(name || '').trim();
            if (!tagName || !selectedSet.has(tagName) || splitSet.has(tagName)) return;
            splitSet.add(tagName);
            groupNames.push(tagName);
        });
        if (groupNames.length === 0) return;
        const id = String(group?.id || `split:${groupNames.join('|')}`).trim();
        normalizedSplitGroups.push({
            id,
            title: group?.title || groupNames.join(', '),
            tagNames: groupNames,
        });
    });

    const groups: DataViewerChartGroup[] = [];
    const defaultNames = selected;
    if (defaultNames.length > 0) {
        groups.push({
            id: 'default',
            title: 'Selected Tags',
            tagNames: defaultNames,
            range: globalRange,
            split: false,
        });
    }

    normalizedSplitGroups.forEach((group) => {
        groups.push({
            id: group.id,
            title: group.title,
            tagNames: group.tagNames,
            range: splitRanges?.[group.id] || globalRange,
            split: true,
        });
    });

    return groups;
}

export function buildDataViewerSplitGroups({
    tagNames = [],
    selectedTagNames = [],
    assignedTagNames = [],
    createId = (name: string, index: number) => `split:${Date.now()}:${index}:${name}`,
}: {
    tagNames?: string[];
    selectedTagNames?: string[];
    assignedTagNames?: string[];
    createId?: (name: string, index: number) => string;
} = {}): DataViewerSplitGroup[] {
    const selectedSet = new Set(selectedTagNames.map((name) => String(name || '').trim()).filter(Boolean));
    const assignedSet = new Set(assignedTagNames.map((name) => String(name || '').trim()).filter(Boolean));
    const seen = new Set<string>();
    const groups: DataViewerSplitGroup[] = [];

    tagNames.forEach((name) => {
        const tagName = String(name || '').trim();
        if (!tagName || seen.has(tagName) || assignedSet.has(tagName) || !selectedSet.has(tagName)) return;
        seen.add(tagName);
        groups.push({
            id: createId(tagName, groups.length),
            title: tagName,
            tagNames: [tagName],
        });
    });

    return groups;
}

export function buildDataViewerSplitRangeUpdate<T extends DataViewerChartStoredRange = DataViewerChartStoredRange>({
    nextGroups = [],
    chartViewRanges = {},
    chartNavigatorRanges = {},
    splitRanges = {},
    sourceGroupId = 'default',
}: {
    nextGroups?: DataViewerSplitGroup[];
    chartViewRanges?: Record<string, T>;
    chartNavigatorRanges?: Record<string, T>;
    splitRanges?: Record<string, T>;
    sourceGroupId?: string;
} = {}) {
    const nextViewRanges: Record<string, T> = { ...chartViewRanges };
    const nextNavigatorRanges: Record<string, T> = { ...chartNavigatorRanges };
    const nextSplitRanges: Record<string, T> = { ...splitRanges };
    const sourceViewRange = chartViewRanges?.[sourceGroupId];
    const sourceNavigatorRange = chartNavigatorRanges?.[sourceGroupId];
    const sourceSplitRange = sourceNavigatorRange || sourceViewRange;

    nextGroups.forEach((group) => {
        const id = String(group?.id || '').trim();
        if (!id) return;
        if (sourceViewRange && !nextViewRanges[id]) nextViewRanges[id] = sourceViewRange;
        if (sourceNavigatorRange && !nextNavigatorRanges[id]) nextNavigatorRanges[id] = sourceNavigatorRange;
        if (sourceSplitRange && !nextSplitRanges[id]) nextSplitRanges[id] = sourceSplitRange;
    });

    return {
        chartViewRanges: nextViewRanges,
        chartNavigatorRanges: nextNavigatorRanges,
        splitRanges: nextSplitRanges,
    };
}

function normalizeDataViewerGlobalTimeRange(range: { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown } = {}) {
    const startValue = range.from ?? range.start ?? range.startTime;
    const endValue = range.to ?? range.end ?? range.endTime;
    const startTime = typeof startValue === 'number' ? startValue : Date.parse(String(startValue ?? ''));
    const endTime = typeof endValue === 'number' ? endValue : Date.parse(String(endValue ?? ''));

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return undefined;

    return {
        from: new Date(startTime).toISOString(),
        to: new Date(endTime).toISOString(),
    };
}

export function buildDataViewerGlobalTimeUpdate({
    sourceGroupId,
    chartGroups = [],
    chartViewRanges = {},
    chartNavigatorRanges = {},
    chartResults = {},
}: {
    sourceGroupId?: string;
    chartGroups?: DataViewerChartGroup[];
    chartViewRanges?: Record<string, { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown }>;
    chartNavigatorRanges?: Record<string, { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown }>;
    chartResults?: Record<string, { range?: { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown } }>;
} = {}) {
    if (!sourceGroupId || chartGroups.length <= 1) return undefined;

    const sourceGroup = chartGroups.find((group) => group?.id === sourceGroupId);
    if (!sourceGroup) return undefined;

    const displayRange =
        normalizeDataViewerGlobalTimeRange(chartViewRanges?.[sourceGroupId]) ||
        normalizeDataViewerGlobalTimeRange(chartResults?.[sourceGroupId]?.range) ||
        normalizeDataViewerGlobalTimeRange(sourceGroup.range);
    const navigatorRange =
        normalizeDataViewerGlobalTimeRange(chartNavigatorRanges?.[sourceGroupId]) ||
        normalizeDataViewerGlobalTimeRange(chartResults?.[sourceGroupId]?.range) ||
        normalizeDataViewerGlobalTimeRange(sourceGroup.range) ||
        displayRange;

    if (!displayRange || !navigatorRange) return undefined;

    const splitRanges: Record<string, { from: string; to: string }> = {};
    const viewRanges: Record<string, { from: string; to: string }> = {};
    const navigatorRanges: Record<string, { from: string; to: string }> = {};
    chartGroups.forEach((group) => {
        if (group?.split && group.id) {
            splitRanges[group.id] = navigatorRange;
        }
        if (group?.id) {
            viewRanges[group.id] = displayRange;
            navigatorRanges[group.id] = navigatorRange;
        }
    });

    return {
        range: navigatorRange,
        splitRanges,
        viewRanges,
        navigatorRanges,
    };
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const PANEL_LEGEND_TOP = 6;
const PANEL_GRID_BOTTOM = 20;
const PANEL_GRID_SIDE = 35;
const PANEL_NAVIGATOR_GRID_SIDE = 58;
const PANEL_SLIDER_HEIGHT = 26;
const PANEL_MAIN_TOP_WITH_LEGEND = 40;
const PANEL_MAIN_HEIGHT = 178;
const PANEL_MAIN_SERIES_ID_PREFIX = 'main-series-';
const PANEL_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
const PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR = 0.82;
const PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR = 1.22;
const AXIS_LINE_STYLE = { lineStyle: { color: '#323333' } };
const AXIS_SPLIT_LINE_STYLE = { color: '#323333', width: 1 };
const PANEL_AXIS_LABEL_STYLE = { color: '#f8f8f8', fontSize: 10 };

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
    const rangeFrom = toEpochMs(range.from);
    const rangeTo = toEpochMs(range.to);

    let min = Number.isFinite(rangeFrom) ? rangeFrom : undefined;
    let max = Number.isFinite(rangeTo) ? rangeTo : undefined;

    if (min === undefined || max === undefined) {
        for (const point of points) {
            const value = Array.isArray(point) ? point[0] : point?.x;
            if (!Number.isFinite(value)) continue;
            const numericValue = Number(value);
            if (min === undefined || numericValue < min) min = numericValue;
            if (max === undefined || numericValue > max) max = numericValue;
        }
    }
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

function formatYAxisLabel(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const units = [
        { value: 1_000_000_000_000, suffix: 'T' },
        { value: 1_000_000_000, suffix: 'B' },
        { value: 1_000_000, suffix: 'M' },
        { value: 1_000, suffix: 'K' },
    ];
    const normalized = Object.is(numeric, -0) ? 0 : numeric;
    const abs = Math.abs(normalized);
    const unit = units.find((item) => abs >= item.value);
    if (!unit) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(normalized);
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(normalized / unit.value)}${unit.suffix}`;
}

function getPanelRange(points: Array<[number, number | null]> = [], timeRange: { from?: unknown; to?: unknown; startTime?: unknown; endTime?: unknown } = {}) {
    const axis = buildDataViewerChartXAxis(points as Array<[number, number]>, {
        from: timeRange.startTime ?? timeRange.from,
        to: timeRange.endTime ?? timeRange.to,
    });
    const now = Date.now();
    return {
        startTime: Number.isFinite(axis.min) ? axis.min : now - HOUR_MS,
        endTime: Number.isFinite(axis.max) ? axis.max : now,
    };
}

export function getDataViewerChartRangeMs(points: Array<[number, number | null]> = [], timeRange: { from?: unknown; to?: unknown; startTime?: unknown; endTime?: unknown } = {}) {
    return getPanelRange(points, timeRange);
}

function getPrimaryDataZoomEventItem(zoomData: any = {}) {
    return Array.isArray(zoomData?.batch) ? zoomData.batch[0] : zoomData;
}

function hasExplicitDataZoomRange(dataZoomState: any = {}) {
    return (
        (dataZoomState.startValue !== undefined && dataZoomState.endValue !== undefined) ||
        (dataZoomState.start !== undefined && dataZoomState.end !== undefined)
    );
}

function getExplicitDataZoomRange(zoomData: any = {}) {
    if (zoomData.startValue === undefined || zoomData.endValue === undefined) return undefined;
    const startTime = Number(zoomData.startValue);
    const endTime = Number(zoomData.endValue);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return undefined;
    return { startTime, endTime };
}

export function extractDataViewerDataZoomRange(params: any = {}, currentRange: DataViewerChartRangeMs = {}, axisRange: DataViewerChartRangeMs = currentRange) {
    const zoomData = getPrimaryDataZoomEventItem(params);
    if (!zoomData) return undefined;

    const explicitRange = getExplicitDataZoomRange(zoomData);
    if (explicitRange) return explicitRange;

    const axisStartTime = Number(axisRange.startTime);
    const axisEndTime = Number(axisRange.endTime);
    const axisSpan = axisEndTime - axisStartTime;
    if (typeof zoomData.start === 'number' && typeof zoomData.end === 'number' && Number.isFinite(axisSpan) && axisSpan > 0) {
        return {
            startTime: axisStartTime + (axisSpan * zoomData.start) / 100,
            endTime: axisStartTime + (axisSpan * zoomData.end) / 100,
        };
    }

    return undefined;
}

export function hasExplicitDataViewerDataZoomEventRange(params: any = {}) {
    const zoomData = getPrimaryDataZoomEventItem(params);
    return zoomData ? hasExplicitDataZoomRange(zoomData) : false;
}

export function isSameDataViewerChartRange(a: DataViewerChartRangeMs = {}, b: DataViewerChartRangeMs = {}) {
    const aStart = Number(a.startTime);
    const aEnd = Number(a.endTime);
    const bStart = Number(b.startTime);
    const bEnd = Number(b.endTime);
    if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
    return Math.floor(aStart) === Math.floor(bStart) && Math.ceil(aEnd) === Math.ceil(bEnd);
}

export function buildDataViewerZoomControlRange(action: string, currentRange: DataViewerChartRangeMs = {}, navigatorRange: DataViewerChartRangeMs = {}, zoom = 0.2) {
    const currentStart = Number(currentRange.startTime);
    const currentEnd = Number(currentRange.endTime);
    const navigatorStart = Number(navigatorRange.startTime);
    const navigatorEnd = Number(navigatorRange.endTime);
    if (![currentStart, currentEnd, navigatorStart, navigatorEnd].every(Number.isFinite)) return undefined;
    if (currentEnd <= currentStart || navigatorEnd <= navigatorStart) return undefined;

    const currentSpan = currentEnd - currentStart;
    const center = currentStart + currentSpan / 2;
    let nextStart = currentStart;
    let nextEnd = currentEnd;

    if (action === 'zoom-in') {
        const offset = currentSpan * zoom;
        nextStart = currentStart + offset;
        nextEnd = currentEnd - offset;
    } else if (action === 'zoom-out') {
        const offset = currentSpan * zoom;
        nextStart = currentStart - offset;
        nextEnd = currentEnd + offset;
    } else if (action === 'focus') {
        const nextSpan = Math.max(currentSpan * 0.2, 1);
        nextStart = center - nextSpan / 2;
        nextEnd = center + nextSpan / 2;
    } else {
        return undefined;
    }

    if (nextStart < navigatorStart) {
        nextEnd += navigatorStart - nextStart;
        nextStart = navigatorStart;
    }
    if (nextEnd > navigatorEnd) {
        nextStart -= nextEnd - navigatorEnd;
        nextEnd = navigatorEnd;
    }
    nextStart = Math.max(nextStart, navigatorStart);
    nextEnd = Math.min(nextEnd, navigatorEnd);
    if (nextEnd <= nextStart) return undefined;
    return { startTime: nextStart, endTime: nextEnd };
}

const PANEL_MAIN_RANGE_SHIFT_FRACTION = 0.3;

export function buildDataViewerShiftMainRangeUpdate({
    direction,
    currentRange = {},
    navigatorRange = {},
}: {
    direction?: 'backward' | 'forward';
    currentRange?: DataViewerChartRangeMs;
    navigatorRange?: DataViewerChartRangeMs;
} = {}) {
    const currentStart = Number(currentRange.startTime);
    const currentEnd = Number(currentRange.endTime);
    const navigatorStart = Number(navigatorRange.startTime);
    const navigatorEnd = Number(navigatorRange.endTime);
    if (![currentStart, currentEnd, navigatorStart, navigatorEnd].every(Number.isFinite)) return null;
    if (currentEnd <= currentStart || navigatorEnd <= navigatorStart) return null;

    const shiftDirection = direction === 'backward' ? -1 : direction === 'forward' ? 1 : 0;
    if (shiftDirection === 0) return null;

    const offset = (currentEnd - currentStart) * PANEL_MAIN_RANGE_SHIFT_FRACTION * shiftDirection;
    const nextStart = currentStart + offset;
    const nextEnd = currentEnd + offset;
    let nextNavigatorStart = navigatorStart;
    let nextNavigatorEnd = navigatorEnd;

    if (shiftDirection < 0 && nextStart < nextNavigatorStart) {
        nextNavigatorStart = nextStart;
        nextNavigatorEnd += offset;
    } else if (shiftDirection > 0 && nextEnd > nextNavigatorEnd) {
        nextNavigatorStart += offset;
        nextNavigatorEnd = nextEnd;
    }

    if (nextEnd <= nextStart || nextNavigatorEnd <= nextNavigatorStart) return null;

    return {
        range: {
            from: new Date(nextStart).toISOString(),
            to: new Date(nextEnd).toISOString(),
        },
        navigatorRange: {
            from: new Date(nextNavigatorStart).toISOString(),
            to: new Date(nextNavigatorEnd).toISOString(),
        },
    };
}

export function buildDataViewerWheelZoomRange(deltaY: number, anchorTime: number | undefined, currentRange: DataViewerChartRangeMs = {}, navigatorRange: DataViewerChartRangeMs = {}) {
    const currentStart = Number(currentRange.startTime);
    const currentEnd = Number(currentRange.endTime);
    const navigatorStart = Number(navigatorRange.startTime);
    const navigatorEnd = Number(navigatorRange.endTime);
    const anchor = Number(anchorTime);
    if (![currentStart, currentEnd, navigatorStart, navigatorEnd, anchor, deltaY].every(Number.isFinite)) return undefined;
    if (deltaY === 0 || currentEnd <= currentStart || navigatorEnd <= navigatorStart) return undefined;

    const currentSpan = currentEnd - currentStart;
    const navigatorSpan = navigatorEnd - navigatorStart;
    const factor = deltaY < 0 ? PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR : PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR;
    const nextSpan = Math.min(Math.max(currentSpan * factor, 1), navigatorSpan);
    const anchorRatio = Math.min(Math.max((anchor - currentStart) / currentSpan, 0), 1);
    let nextStart = anchor - nextSpan * anchorRatio;
    let nextEnd = nextStart + nextSpan;

    if (nextStart < navigatorStart) {
        nextEnd += navigatorStart - nextStart;
        nextStart = navigatorStart;
    }
    if (nextEnd > navigatorEnd) {
        nextStart -= nextEnd - navigatorEnd;
        nextEnd = navigatorEnd;
    }
    nextStart = Math.max(nextStart, navigatorStart);
    nextEnd = Math.min(nextEnd, navigatorEnd);
    if (nextEnd <= nextStart) return undefined;
    return { startTime: nextStart, endTime: nextEnd };
}

function getRoundedAxisStep(axisRangeValue: number) {
    const reference = Math.max(Math.abs(axisRangeValue) / 5, Number.MIN_VALUE);
    const exponent = Math.floor(Math.log10(reference));
    const magnitude = 10 ** exponent;
    const fraction = reference / magnitude;
    if (fraction <= 1) return magnitude;
    if (fraction <= 2) return 2 * magnitude;
    if (fraction <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

function getYAxisRange(series: Array<{ data?: Array<[number, number | null]> }>, panelRange: Required<DataViewerChartRangeMs>) {
    let rawMin: number | undefined;
    let rawMax: number | undefined;
    series.forEach((item) => {
        (item.data || []).forEach(([x, y]) => {
            if (x >= panelRange.startTime && x <= panelRange.endTime && typeof y === 'number' && Number.isFinite(y)) {
                if (rawMin === undefined || y < rawMin) rawMin = y;
                if (rawMax === undefined || y > rawMax) rawMax = y;
            }
        });
    });
    if (rawMin === undefined || rawMax === undefined) return { min: undefined, max: undefined };
    const range = rawMax - rawMin;
    const fallback = Math.max(Math.abs(rawMax), Math.abs(rawMin), 1);
    const step = getRoundedAxisStep(range > 0 ? range : fallback);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step;
    return {
        min: Number(min.toPrecision(12)),
        max: Number((max > min ? max : min + step).toPrecision(12)),
    };
}

function buildNeoLikeTooltipFormatter(params: any, timeFormat: string, timeZone: string) {
    const items = (Array.isArray(params) ? params : [params]).filter((item) => String(item?.seriesId || '').startsWith(PANEL_MAIN_SERIES_ID_PREFIX));
    if (items.length === 0) return '';
    const firstValue = Array.isArray(items[0].value) ? items[0].value : [];
    const time = formatDataViewerTime(Number(firstValue[0] ?? items[0].axisValue), timeFormat, timeZone);
    return `<div style="max-width:240px">
        <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${time}</div>
        <div style="padding:6px 0 0 10px;max-width:230px">
        ${items
            .map((item) => {
                const value = Array.isArray(item.value) ? item.value[1] : '';
                const colorStyle = typeof item.color === 'string' ? `color:${item.color};` : '';
                return `<div style="${colorStyle}margin:0;padding:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.seriesName} : ${value ?? ''}</div>`;
            })
            .join('')}
        </div>
    </div>`;
}

function positionDataViewerTooltip(point: number[], _params: any, _dom: HTMLElement, _rect: any, size: { contentSize?: number[]; viewSize?: number[] }) {
    const [x = 0, y = 0] = point || [];
    const [contentWidth = 0, contentHeight = 0] = size.contentSize || [];
    const [viewWidth = 0, viewHeight = 0] = size.viewSize || [];
    const margin = 12;
    const safeWidth = Math.min(contentWidth, 260);
    const left = x + margin + safeWidth <= viewWidth ? x + margin : Math.max(margin, x - safeWidth - margin);
    const top = y + margin + contentHeight <= viewHeight ? y + margin : Math.max(margin, y - contentHeight - margin);
    return [left, top];
}

export function buildDataViewerEChartOption({
    series = [],
    timeRange = {},
    displayRange,
    timeFormat = DEFAULT_TIME_FORMAT,
    timeZone = DEFAULT_TIME_ZONE,
}: {
    series?: Array<{ name: string; data: Array<[number, number | null]> }>;
    timeRange?: { from?: unknown; to?: unknown };
    displayRange?: { from?: unknown; to?: unknown };
    timeFormat?: string;
    timeZone?: string;
} = {}) {
    const allPoints = series.flatMap((item) => (Array.isArray(item?.data) ? item.data : []));
    const panelRange = getPanelRange(allPoints, displayRange || timeRange) as Required<DataViewerChartRangeMs>;
    const navigatorRange = getPanelRange(allPoints, timeRange) as Required<DataViewerChartRangeMs>;
    const yAxisRange = getYAxisRange(series, panelRange);

    return {
        backgroundColor: '#252525',
        animation: false,
        textStyle: { fontFamily: 'Open Sans, Helvetica, Arial, sans-serif' },
        color: PANEL_COLORS,
        grid: [
            { id: 'panel-main-grid', left: PANEL_GRID_SIDE, right: PANEL_GRID_SIDE, top: PANEL_MAIN_TOP_WITH_LEGEND, height: PANEL_MAIN_HEIGHT, containLabel: true },
            { id: 'panel-navigator-grid', left: PANEL_NAVIGATOR_GRID_SIDE, right: PANEL_NAVIGATOR_GRID_SIDE, bottom: PANEL_GRID_BOTTOM, height: PANEL_SLIDER_HEIGHT },
        ],
        legend: { show: true, left: 10, top: PANEL_LEGEND_TOP, itemGap: 15, textStyle: { color: '#e7e8ea', fontSize: 10 } },
        tooltip: {
            trigger: 'axis',
            confine: true,
            appendToBody: true,
            extraCssText: 'max-width:260px;white-space:normal;pointer-events:none;',
            backgroundColor: '#1f1d1d',
            borderColor: '#292929',
            borderWidth: 1,
            textStyle: { color: '#afb5bc', fontSize: 10 },
            axisPointer: { type: 'line', snap: false },
            position: positionDataViewerTooltip,
            formatter: (params: any) => buildNeoLikeTooltipFormatter(params, timeFormat, timeZone),
        },
        xAxis: [
            {
                id: 'panel-main-x-axis',
                type: 'time',
                gridIndex: 0,
                min: panelRange.startTime,
                max: panelRange.endTime,
                axisLine: AXIS_LINE_STYLE,
                axisTick: AXIS_LINE_STYLE,
                axisLabel: {
                    ...PANEL_AXIS_LABEL_STYLE,
                    formatter: (value: unknown) => formatDataViewerAxisTime(value, { min: panelRange.startTime, max: panelRange.endTime }, timeZone),
                },
                splitLine: { show: true, lineStyle: AXIS_SPLIT_LINE_STYLE },
                axisPointer: { label: { show: false } },
            },
            {
                id: 'panel-navigator-x-axis',
                type: 'time',
                gridIndex: 1,
                min: navigatorRange.startTime,
                max: navigatorRange.endTime,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                axisPointer: { show: false, label: { show: false } },
            },
            {
                id: 'panel-navigator-data-x-axis',
                type: 'time',
                gridIndex: 1,
                min: navigatorRange.startTime,
                max: navigatorRange.endTime,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                axisPointer: { show: false, label: { show: false } },
            },
        ],
        yAxis: [
            {
                id: 'panel-left-y-axis',
                type: 'value',
                gridIndex: 0,
                min: yAxisRange.min,
                max: yAxisRange.max,
                axisLine: AXIS_LINE_STYLE,
                axisLabel: { color: '#afb5bc', fontSize: 10, formatter: formatYAxisLabel },
                splitLine: { show: true, lineStyle: AXIS_SPLIT_LINE_STYLE },
                minInterval: 0,
                scale: true,
            },
            {
                id: 'panel-navigator-y-axis',
                type: 'value',
                gridIndex: 1,
                boundaryGap: ['18%', '18%'],
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                axisPointer: { show: false, label: { show: false } },
                scale: true,
            },
        ],
        dataZoom: [
            {
                id: 'panel-inside-data-zoom',
                type: 'inside',
                xAxisIndex: [1],
                filterMode: 'none',
                startValue: panelRange.startTime,
                endValue: panelRange.endTime,
                zoomOnMouseWheel: false,
                moveOnMouseMove: false,
                moveOnMouseWheel: false,
                preventDefaultMouseMove: true,
            },
            {
                id: 'panel-slider-data-zoom',
                type: 'slider',
                xAxisIndex: [1],
                filterMode: 'none',
                startValue: panelRange.startTime,
                endValue: panelRange.endTime,
                realtime: false,
                left: PANEL_NAVIGATOR_GRID_SIDE,
                right: PANEL_NAVIGATOR_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: PANEL_SLIDER_HEIGHT,
                showDetail: false,
                brushSelect: false,
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderColor: '#7a828c',
                fillerColor: 'rgba(104, 119, 138, 0.28)',
                showDataShadow: false,
                handleSize: 24,
                handleStyle: { color: 'rgba(245, 247, 250, 0.78)', borderColor: '#8a939e' },
                moveHandleStyle: { color: 'rgba(245, 247, 250, 0.32)', opacity: 0.75 },
            },
        ],
        toolbox: { show: false },
        title: { show: false },
        series: [
            ...series.map((item, index) => ({
                id: `${PANEL_MAIN_SERIES_ID_PREFIX}${index}`,
                name: item.name,
                type: 'line',
                legendHoverLink: false,
                data: Array.isArray(item.data) ? item.data : [],
                xAxisIndex: 0,
                yAxisIndex: 0,
                symbol: 'circle',
                showSymbol: false,
                symbolSize: 6,
                animation: false,
                sampling: item.data?.length > 1000 ? 'lttb' : undefined,
                lineStyle: { width: 1, color: PANEL_COLORS[index % PANEL_COLORS.length], opacity: 1 },
                itemStyle: { color: PANEL_COLORS[index % PANEL_COLORS.length], opacity: 1 },
                connectNulls: false,
                triggerEvent: true,
                z: 2,
            })),
            ...series.map((item, index) => ({
                id: `navigator-series-${index}`,
                name: item.name,
                type: 'line',
                legendHoverLink: false,
                data: Array.isArray(item.data) ? item.data : [],
                xAxisIndex: 2,
                yAxisIndex: 1,
                showSymbol: false,
                silent: true,
                tooltip: { show: false },
                animation: false,
                sampling: item.data?.length > 1000 ? 'lttb' : undefined,
                lineStyle: { width: 1, color: PANEL_COLORS[index % PANEL_COLORS.length], opacity: 0.85 },
                itemStyle: { color: PANEL_COLORS[index % PANEL_COLORS.length], opacity: 0.85 },
                emphasis: { disabled: true },
                z: 1,
            })),
        ],
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

function cleanTagName(name: unknown) {
    return String(name ?? '').trim();
}

function getSelectableTagNames(rows: DataViewerTreeRow[] = []) {
    const names: string[] = [];
    const seen = new Set<string>();

    rows.forEach((row) => {
        if (row?.type !== 'tag') return;
        const name = cleanTagName(row.name);
        if (!name || seen.has(name)) return;
        seen.add(name);
        names.push(name);
    });

    return names;
}

export function normalizeSelectedTagNames(selectedNames: string[] = [], selectableRows: DataViewerTreeRow[] = []) {
    const selectableNames = getSelectableTagNames(selectableRows);
    if (selectableNames.length === 0) return [];

    const selectable = new Set(selectableNames);
    const seen = new Set<string>();
    const normalized = (Array.isArray(selectedNames) ? selectedNames : [])
        .map(cleanTagName)
        .filter((name) => {
            if (!name || !selectable.has(name) || seen.has(name)) return false;
            seen.add(name);
            return true;
        });

    return normalized.length > 0 ? normalized : [selectableNames[0]];
}

export function toggleSelectedTagName(selectedNames: string[] = [], tagName = '') {
    const name = cleanTagName(tagName);
    const current = (Array.isArray(selectedNames) ? selectedNames : []).map(cleanTagName).filter(Boolean);
    if (!name) return current;
    if (current.includes(name)) return current.filter((selectedName) => selectedName !== name);
    return [...current, name];
}

export function buildDataViewerTagSelectionUpdate({
    selectedTagNames = [],
    tagName = '',
    currentPage = 1,
    pageSize,
    currentBounds,
}: {
    selectedTagNames?: string[];
    tagName?: string;
    currentPage?: number;
    pageSize?: number;
    currentBounds?: ReturnType<typeof buildDataViewerRawPageBounds>;
} = {}) {
    const nextSelectedTagNames = toggleSelectedTagName(selectedTagNames, tagName);
    return {
        selectedTagNames: nextSelectedTagNames,
        rawPageRequest: buildDataViewerRawPageRequest({
            currentPage,
            nextPage: currentPage,
            pageSize: pageSize ?? getDataViewerRawPageSize(nextSelectedTagNames),
            currentBounds,
            reason: 'tags',
        }),
        preserveChartRanges: true,
    };
}

export function formatDataViewerTime(value: unknown, timeFormat: string, timeZone: string) {
    if (value === null || value === undefined || value === '') return '';

    const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    const epochMs = Number.isFinite(numeric) ? (Math.abs(numeric) > 100_000_000_000_000 ? numeric / 1_000_000 : numeric) : toEpochMs(value);
    if (!Number.isFinite(epochMs)) return String(value);
    if (timeFormat === 'ns' || timeFormat === 'EPOCH_NS') return String(BigInt(Math.trunc(epochMs)) * 1000000n);
    if (timeFormat === 'us') return String(Math.trunc(epochMs * 1000));
    if (timeFormat === 'ms' || timeFormat === 'EPOCH_MS') return String(Math.trunc(epochMs));
    if (timeFormat === 's') return String(Math.trunc(epochMs / 1000));

    const date = new Date(epochMs);
    if (Number.isNaN(date.getTime())) return String(value);
    if (timeFormat === 'ISO') return date.toISOString();

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
    if (timeFormat === '2006-02-01') return `${parts.year}-${parts.day}-${parts.month}`;
    if (timeFormat === '02-01-2006') return `${parts.day}-${parts.month}-${parts.year}`;
    if (timeFormat === '01-02-2006') return `${parts.month}-${parts.day}-${parts.year}`;
    if (timeFormat === '06-02-01') return `${String(parts.year).slice(-2)}-${parts.day}-${parts.month}`;
    if (timeFormat === '06-01-02') return `${String(parts.year).slice(-2)}-${parts.month}-${parts.day}`;
    if (timeFormat === '01-02-06') return `${parts.month}-${parts.day}-${String(parts.year).slice(-2)}`;
    if (timeFormat === '02-01-06') return `${parts.day}-${parts.month}-${String(parts.year).slice(-2)}`;
    if (timeFormat === '2006-01-02 15:04') return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    if (timeFormat === '2006-01-02 15') return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}`;
    if (timeFormat === '2006-01-02 15:04:05') return base;
    if (timeFormat === 'YYYY-MM-DD HH24:MI:SS') return base;
    if (timeFormat === 'HH24:MI:SS.mmm') return `${parts.hour}:${parts.minute}:${parts.second}.${String(date.getMilliseconds()).padStart(3, '0')}`;
    if (!timeFormat.includes('.')) return base;
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    if (timeFormat === '2006-01-02 15:04:05.000000') return `${base}.${ms}000`;
    if (timeFormat === '2006-01-02 15:04:05.000000000') return `${base}.${ms}000000`;
    return `${base}.${ms}`;
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

export function formatDataViewerNavigatorRangeLabels(
    range: { startTime?: unknown; endTime?: unknown; from?: unknown; to?: unknown } = {},
    timeFormat = DEFAULT_TIME_FORMAT,
    timeZone = DEFAULT_TIME_ZONE,
) {
    const startTime = toEpochMs(range.startTime ?? range.from);
    const endTime = toEpochMs(range.endTime ?? range.to);
    return {
        start: Number.isFinite(startTime) ? formatDataViewerTime(startTime, timeFormat, timeZone) : '',
        end: Number.isFinite(endTime) ? formatDataViewerTime(endTime, timeFormat, timeZone) : '',
    };
}

function formatDateTimeForSql(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
