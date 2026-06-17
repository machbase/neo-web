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
