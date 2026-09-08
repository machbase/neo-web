import { isJsonTypeColumn } from '@/utils/dashboardJsonValue';
import { getCurrentDatabaseId, normalizeDatabaseId } from '@/utils/currentDatabaseState';
import { DATETIME_COLUMN_TYPE, getDefaultTimeFieldColumn, isNonDateTimeBaseTimeColumn } from '@/utils/timeFieldColumns';
import {
    buildDistanceQuickWindow as buildDataViewerDistanceQuickWindow,
    buildDistanceSliderClickRange as buildDataViewerDistanceSliderClickRange,
    formatDistanceEdgeLabel,
    formatDistanceValue as formatDataViewerDistance,
    isDistanceAnchorEdge,
    parseDistanceValue as parseDataViewerDistanceValue,
    snapDistanceEdge as snapDataViewerDistanceEdge,
} from '@/utils/distanceRange';

export const DEFAULT_TIME_FORMAT = '2006-01-02 15:04:05.000';
export const DEFAULT_TIME_ZONE = 'LOCAL';

/**
 * Which axis a TAG table's base column measures.
 *
 * Machbase marks exactly one column BASETIME. It is usually a DATETIME — the ordinary time series
 * case — but a non-DATETIME BASETIME (an odometer, say) is legal and means the rows are ordered by
 * distance, not time. A time range is meaningless against one, so the page has to be able to tell
 * them apart.
 */
export type DataViewerBaseKind = 'time' | 'distance';

/**
 * Where each field lives in a `listTableColumns` row.
 *
 * That query projects NAME, TYPE, FLAG — three positions, all read by index, and the type and the
 * flag sit next to each other, so a reader that reaches for the wrong one still finds a number and
 * fails silently. The whole contract is stated here, once, and every reader in this module goes
 * through these constants; do not index a Data Viewer column row anywhere else.
 *
 * The flag index matters twice over: `@/utils/timeFieldColumns` defaults to 4, which describes the
 * DB Explorer's wider column row, so passing this module's rows without overriding the index reads
 * `undefined` as the flag — falsy — and every column silently comes back non-BASETIME.
 */
export const DATA_VIEWER_COLUMN_NAME_INDEX = 0;
export const DATA_VIEWER_COLUMN_TYPE_INDEX = 1;
export const DATA_VIEWER_COLUMN_FLAG_INDEX = 2;

/**
 * The table's base column: the BASETIME-flagged one, else the first DATETIME. `fallback` covers a
 * metadata read that failed or returned nothing — the page passes its configured time column, so
 * an unknown schema behaves exactly as it did before the lookup existed.
 */
export function resolveDataViewerBaseColumn(columns: unknown[] = [], fallback = 'TIME') {
    return getDefaultTimeFieldColumn(columns as any[], DATA_VIEWER_COLUMN_FLAG_INDEX) || fallback;
}

/** BASETIME but not DATETIME ⇒ the base is a distance axis. Anything else — including an unknown schema — is time. */
export function resolveDataViewerBaseKind(columns: unknown[] = [], baseColumn: string): DataViewerBaseKind {
    return isNonDateTimeBaseTimeColumn(columns as any[], baseColumn, DATA_VIEWER_COLUMN_FLAG_INDEX) ? 'distance' : 'time';
}

/**
 * The base column's declared type code, for handing to Tag Analyzer.
 *
 * `resolveDataViewerBaseKind` answers the question this page asks — time or distance — but the Tag
 * Analyzer payload speaks in type codes, not in kinds: its `isNumericBaseTimeSourceColumns` reads
 * `timeBaseTime === true && timeType !== DATETIME_COLUMN_TYPE`. Handing it a hardcoded 6 tells it
 * "DATETIME" no matter what the column really is, which is exactly how a distance board used to
 * open as a 1970 time board. Pass the column's own type instead and the two sides agree by
 * construction.
 *
 * An unresolved schema falls back to DATETIME, matching `resolveDataViewerBaseKind`'s own default:
 * an unknown base is time, and the two answers must never disagree.
 */
export function resolveDataViewerBaseColumnType(columns: unknown[] = [], baseColumn: string): number {
    const target = String(baseColumn ?? '').trim().toLowerCase();
    if (!target || !Array.isArray(columns)) return DATETIME_COLUMN_TYPE;

    const row = columns.find(
        (column) => Array.isArray(column) && String(column[DATA_VIEWER_COLUMN_NAME_INDEX] ?? '').trim().toLowerCase() === target
    ) as unknown[] | undefined;
    if (!row) return DATETIME_COLUMN_TYPE;

    const type = Number(row[DATA_VIEWER_COLUMN_TYPE_INDEX]);
    return Number.isFinite(type) ? type : DATETIME_COLUMN_TYPE;
}

/**
 * Is the table's value column a JSON column?
 *
 * A JSON value is an object, not a number: the raw grid would print `[object Object]`, the chart
 * would plot NaN, and every aggregate the page can ask for is undefined against it. The page has no
 * path extractor, so the honest answer is to refuse the table rather than render nonsense.
 *
 * "Unknown" is not "JSON": an empty or unmatched column list means the metadata read failed or the
 * table is shaped differently than expected, and locking a perfectly good table out of the viewer
 * because its schema could not be read is the worse failure. Names are compared case-insensitively,
 * matching how `resolveDataViewerBaseKind` matches its base column.
 */
export function isDataViewerJsonValueColumn(columns: unknown[] = [], valueColumn: string) {
    const target = String(valueColumn ?? '').trim().toLowerCase();
    if (!target || !Array.isArray(columns)) return false;

    const row = columns.find(
        (column) => Array.isArray(column) && String(column[DATA_VIEWER_COLUMN_NAME_INDEX] ?? '').trim().toLowerCase() === target
    ) as unknown[] | undefined;
    if (!row) return false;

    return isJsonTypeColumn(Number(row[DATA_VIEWER_COLUMN_TYPE_INDEX]));
}

/** Axis badge on the range chip, matching the dashboard's TIME / DIST chips. */
export function getDataViewerBaseAxisLabel(baseKind: DataViewerBaseKind) {
    return baseKind === 'distance' ? 'DIST' : 'TIME';
}

/**
 * The window a table opens on, per base axis.
 *
 * A time table opens on the last hour of its own newest sample. A distance table has no clock to
 * anchor that to — `last-1h` is not a distance — so it opens on a fixed numeric span instead.
 * 0–1000 is a deliberate starting point rather than a measured one: it is small enough to come back
 * instantly on a million-row odometer table and is where the first samples of such a table live.
 *
 * Both are module constants, not literals rebuilt per call, so `getDataViewerDefaultRange` returns a
 * stable identity — the page uses it as a render-time fallback and a fresh object each render would
 * re-fire every query that keys off the range.
 */
export const DEFAULT_DATA_VIEWER_TIME_RANGE = { from: 'last-1h', to: 'last' };
export const DEFAULT_DATA_VIEWER_DISTANCE_RANGE = { from: 0, to: 1000 };

export function getDataViewerDefaultRange(baseKind: DataViewerBaseKind) {
    return baseKind === 'distance' ? DEFAULT_DATA_VIEWER_DISTANCE_RANGE : DEFAULT_DATA_VIEWER_TIME_RANGE;
}

// ── distance edges ────────────────────────────────────────────────────────────────────────────
// The arithmetic itself lives in `@/utils/distanceRange`, because the dashboard's DistanceRangeTab
// draws the same editor and a thumb drag has to mean the same number in both. These aliases are the
// names the Data Viewer has always imported, kept so nothing downstream has to know where it moved.
export { parseDataViewerDistanceValue, formatDataViewerDistance, snapDataViewerDistanceEdge, buildDataViewerDistanceSliderClickRange, buildDataViewerDistanceQuickWindow };

/**
 * A base-column value, formatted for whichever axis the table actually has.
 *
 * `formatDataViewerTime` reads any finite number as an epoch, so an odometer reading of 999990 comes
 * back as `1970-01-01 00:16:39.990` — a date, rendered with total confidence, that is nowhere in the
 * data. Every base-column display goes through here so that misread has exactly one place it could
 * come from.
 */
export function formatDataViewerBaseValue(value: unknown, baseKind: DataViewerBaseKind, timeFormat: string, timeZone: string) {
    if (baseKind === 'distance') return formatDataViewerDistance(value);
    return formatDataViewerTime(value, timeFormat, timeZone);
}

/**
 * The range chip's value, per axis: an expression on time, a coordinate or an expression on distance.
 *
 * A distance edge is not always a number. It can be pinned to the data — `first`, `last`,
 * `last-5000` — exactly the way `last-1h` is on the time axis, and that is what the quick windows
 * write. `parseDataViewerDistanceValue` refuses those by design (they are not literals to build SQL
 * from), so reading the chip off it alone called a perfectly ordinary `first ~ last` window "not
 * set" while the resolved caption beside it spelled out the very window being queried. An anchored
 * edge keeps its expression here, the same way the dashboard's DIST chip shows it.
 */
export function formatDataViewerBaseRangeLabel(from: unknown, to: unknown, baseKind: DataViewerBaseKind = 'time') {
    if (baseKind !== 'distance') return formatTimeRangeLabel(from, to);

    const start = parseDataViewerDistanceValue(from);
    const end = parseDataViewerDistanceValue(to);
    const fromAnchored = isDistanceAnchorEdge(from);
    const toAnchored = isDistanceAnchorEdge(to);
    if (start === null && end === null && !fromAnchored && !toAnchored) return 'Distance range not set';
    const startText = fromAnchored ? formatDistanceEdgeLabel(from) : start === null ? 'Start' : formatDataViewerDistance(start);
    const endText = toAnchored ? formatDistanceEdgeLabel(to) : end === null ? 'End' : formatDataViewerDistance(end);
    return `${startText} ~ ${endText}`;
}

/**
 * Is `from` past `to`?
 *
 * On a distance axis this has to be a numeric comparison. `new Date('0')` is the year 2000 and
 * `new Date('1000')` is the year 1000, so the date path would call the perfectly ordinary window
 * 0 ~ 1000 reversed and refuse to query it.
 */
export function isDataViewerRangeReversed(from: unknown, to: unknown, baseKind: DataViewerBaseKind = 'time') {
    if (baseKind === 'distance') {
        const start = parseDataViewerDistanceValue(from);
        const end = parseDataViewerDistanceValue(to);
        return start !== null && end !== null && start > end;
    }
    const start = toEpochMs(from);
    const end = toEpochMs(to);
    return Number.isFinite(start) && Number.isFinite(end) && start > end;
}

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
// The base column is aliased `time` in SQL on both axes, so `time` is the row key, the column order
// entry and the page-cursor field regardless of what the base column is called or measures. Only
// the header *label* follows the axis — renaming the key would break every one of those readers for
// a cosmetic gain.
const RAW_BASE_COLUMN_KEY = 'time';
const RAW_BASE_COLUMN_LABELS: Record<DataViewerBaseKind, string> = { time: 'Time', distance: 'Distance' };

function formatRawColumnLabel(key: string) {
    return String(key || '')
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

/**
 * The raw grid's columns, in display order.
 *
 * `baseKind` is an option rather than a caller-side relabel because this function already owns
 * `label` — `formatRawColumnLabel` is its own — and the header and `buildRawColumnWidths` both read
 * the returned array. Overwriting the label afterwards would mean either two arrays (the widths
 * would size against a label the header no longer shows) or a second place that knows a base column
 * is called `time`. It stays a pure function of (rows, options); nothing about the axis is read from
 * anywhere but the argument.
 */
export function buildRawResultColumns(
    rows: Record<string, unknown>[] = [],
    options: { hiddenKeys?: string[]; hideAssetMetadata?: boolean; baseKind?: DataViewerBaseKind } = {},
) {
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

    const baseLabel = RAW_BASE_COLUMN_LABELS[options.baseKind === 'distance' ? 'distance' : 'time'];

    return orderedKeys.map((key) => ({
        key,
        label: key === RAW_BASE_COLUMN_KEY ? baseLabel : formatRawColumnLabel(key),
    }));
}

// Walks PANEL_COLORS in name order, which is how ECharts assigns colours to a panel's series.
// One map built from the main panel's order is then handed to every panel and to the raw table,
// so a tag keeps its colour when it is split into its own chart — a split panel holds a single
// series and would otherwise always take the first palette entry.
export function buildSeriesColorMap(names: unknown[] = []): Record<string, string> {
    const colors: Record<string, string> = {};
    let index = 0;

    for (const raw of Array.isArray(names) ? names : []) {
        const name = String(raw ?? '');
        if (!name || colors[name]) continue;
        colors[name] = PANEL_COLORS[index % PANEL_COLORS.length];
        index += 1;
    }

    return colors;
}

// Colour per tag name for the raw table's name dot. buildTagChartSeries keys its series off the
// order names first appear in the rows, so feeding the same order here makes a tag's dot match
// the line it gets in the chart.
export function buildRawRowNameColors(rows: unknown[] = []): Record<string, string> {
    return buildSeriesColorMap((Array.isArray(rows) ? rows : []).map((row) => getRawRowNameValue(row)));
}

// Measured for the raw table's fonts: monospace 14px cells, bold 14px sans headers.
const RAW_MONO_CHAR_WIDTH = 8.401;
const RAW_HEADER_CHAR_WIDTH = 7;
// .data-viewer-raw-table td { padding: 0 16px }
const RAW_CELL_PADDING = 32;
const RAW_COLUMN_MIN_WIDTH = 90;
// The cap is the only thing that can clip a raw cell. The table is `table-layout: fixed` with a
// definite width (`.table-clean { width: 100% }`), so the <colgroup> widths this function returns
// are authoritative: whatever does not fit inside them is ellipsized by the td's `overflow: hidden`.
// Measured in Chrome — a 640px cap over a 231-character JSON value produced a 640px cell holding
// 1506px of text, i.e. an ellipsis with no horizontal scroll to recover the tail, because the table
// was never asked to be wider than the pane. (The `max-width` that used to sit on the td is inert
// under fixed layout; raising the cap alone is what un-clipped the cell.)
//
// So the cap has to clear real content, not merely "ordinary tag names". 10000px is ~1190 monospace
// characters at RAW_MONO_CHAR_WIDTH — whole JSON telemetry documents, full OPC UA paths, long
// VARCHAR values. It stays finite only so one pathological multi-KB blob cannot produce a table
// whose scrollbar thumb is too small to grab: against a ~1200px results pane 10000px is roughly
// eight screens of travel, which is still a usable thumb.
const RAW_COLUMN_MAX_WIDTH = 10000;
// Char width is an estimate, so round up and leave a couple of pixels: landing 0.2px short is
// enough for the browser to ellipsize a value that otherwise fits exactly.
const RAW_COLUMN_SLACK = 2;

// Column widths derived from the whole result set, not from the rows currently mounted.
// `table-layout: fixed` is required by the virtualised body, and fixed layout otherwise sizes
// columns to the ~40 visible rows — content gets clipped and the table can never exceed its
// container, which is what removes the horizontal scrollbar. Measuring every row instead keeps
// the widths stable while scrolling and lets the table overflow when the data is genuinely wide.
export function buildRawColumnWidths(
    rows: Record<string, unknown>[] = [],
    columns: Array<{ key: string; label?: string }> = [],
    options: { timeSample?: string; extra?: Record<string, number>; charWidth?: number } = {},
): Record<string, number> {
    // `charWidth` is the advance width measured from the font that actually renders. The constant
    // below is calibrated for D2Coding, but neo-web declares that face with `format(woff)`
    // (unquoted — invalid per CSS Fonts 3), so cells can silently fall back to the UA monospace.
    // An error of 0.24px per character is enough to ellipsize an 11-character value, so prefer a
    // real measurement and keep the constant only as a fallback (e.g. jsdom, no canvas).
    const { timeSample = '', extra = {}, charWidth } = options;
    const monoCharWidth = Number.isFinite(charWidth) && (charWidth as number) > 0 ? (charWidth as number) : RAW_MONO_CHAR_WIDTH;
    const safeRows = Array.isArray(rows) ? rows : [];
    const widths: Record<string, number> = {};

    for (const column of Array.isArray(columns) ? columns : []) {
        if (!column || !column.key) continue;
        let chars = 0;
        if (column.key === 'time') {
            // Timestamps render at a fixed width, so one formatted sample stands for all rows.
            chars = String(timeSample).length;
        } else {
            for (const row of safeRows) {
                const length = String(row?.[column.key] ?? '').length;
                if (length > chars) chars = length;
            }
        }

        const headerPx = String(column.label ?? '').length * RAW_HEADER_CHAR_WIDTH;
        const cellPx = chars * monoCharWidth + (extra[column.key] || 0);
        const px = Math.ceil(Math.max(headerPx, cellPx) + RAW_CELL_PADDING + RAW_COLUMN_SLACK);
        widths[column.key] = Math.min(RAW_COLUMN_MAX_WIDTH, Math.max(RAW_COLUMN_MIN_WIDTH, px));
    }

    return widths;
}

export function getScanDirectionLabel(backwardScan: boolean) {
    return backwardScan ? 'Backward' : 'Forward';
}

export function shouldFetchDataViewerRowsForMode(mode: unknown) {
    return mode === 'raw' || mode === 'chart';
}

export const DEFAULT_DATA_VIEWER_ROWS_PER_TAG = 500;

export function normalizeDataViewerRowsPerTag(value: unknown, fallback = DEFAULT_DATA_VIEWER_ROWS_PER_TAG) {
    const fallbackValue = Math.max(1, Math.floor(Number(fallback) || DEFAULT_DATA_VIEWER_ROWS_PER_TAG));
    if (value === '' || value === null || value === undefined) return fallbackValue;
    const next = Math.floor(Number(value));
    return Number.isFinite(next) && next > 0 ? next : fallbackValue;
}

export function getDataViewerRawPageSize(selectedTagNames: unknown[] = [], rowsPerTag = DEFAULT_DATA_VIEWER_ROWS_PER_TAG) {
    const tagCount = Array.isArray(selectedTagNames) ? selectedTagNames.length : 0;
    return Math.max(1, tagCount) * normalizeDataViewerRowsPerTag(rowsPerTag);
}

export function buildDataViewerRawRowsPerTagChange({
    value,
    currentRowsPerTag = DEFAULT_DATA_VIEWER_ROWS_PER_TAG,
    selectedTagNames = [],
}: {
    value?: unknown;
    currentRowsPerTag?: number;
    selectedTagNames?: unknown[];
} = {}) {
    const rowsPerTag = normalizeDataViewerRowsPerTag(value, currentRowsPerTag);
    if (rowsPerTag === normalizeDataViewerRowsPerTag(currentRowsPerTag)) return null;
    return {
        rowsPerTag,
        pageSize: getDataViewerRawPageSize(selectedTagNames, rowsPerTag),
        page: 1,
        rawPageRequest: { page: 1 },
    };
}

export function buildDataViewerDefaultChartShiftRawPageUpdate({
    direction,
    backwardScan = true,
    currentPage = 1,
    pageSize = DEFAULT_DATA_VIEWER_ROWS_PER_TAG,
    rowCount = pageSize,
    forceNextPage = false,
    currentBounds,
}: {
    direction?: 'backward' | 'forward';
    backwardScan?: boolean;
    currentPage?: number;
    pageSize?: number;
    rowCount?: number;
    forceNextPage?: boolean;
    currentBounds?: ReturnType<typeof buildDataViewerRawPageBounds>;
} = {}) {
    const page = Number(currentPage);
    if (!Number.isFinite(page) || page < 1) return null;
    const backward = Boolean(backwardScan);
    const nextPage = direction === 'backward' ? (backward ? page + 1 : page - 1) : direction === 'forward' ? (backward ? page - 1 : page + 1) : page;
    if (nextPage < 1 || nextPage === page) return null;
    if (nextPage > page && !hasDataViewerRawNextPage({ rowCount, pageSize, forceOpen: forceNextPage })) return null;
    const rawPageRequest = buildDataViewerRawPageRequest({
        currentPage: page,
        nextPage,
        pageSize,
        currentBounds,
        reason: 'page',
    });
    return {
        page: rawPageRequest.page,
        rawPageRequest,
    };
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

export type DataViewerRawPageBounds = {
    pageStart: { time: string | number; name: string };
    pageEnd: { time: string | number; name: string };
    pageBounds: { from: string | number; to: string | number };
};

export type DataViewerRawPageRequest =
    | { page: number; from: string | number; to: string | number; boundedRange: true; cursorSide?: undefined; cursorTime?: undefined; cursorName?: undefined; cursorOffset?: undefined }
    | { page: number; from?: undefined; to?: undefined; boundedRange?: undefined; cursorSide?: undefined; cursorTime?: undefined; cursorName?: undefined; cursorOffset?: undefined }
    | { page: number; from?: undefined; to?: undefined; boundedRange?: undefined; cursorSide: 'next' | 'prev'; cursorTime: string | number; cursorName: string; cursorOffset: number };

/**
 * The keyset cursor anchors for the page currently on screen, plus the span it covers.
 *
 * `baseKind` decides what a base value *is*. On a distance axis it stays the number it already was:
 * pushing an odometer reading of 999990 through `new Date(...)` yields `1970-01-01T00:16:39.990Z`,
 * and the cursor built from that would compare `TO_TIMESTAMP('1970-…')` against a DOUBLE column —
 * a page move that silently returns nothing. The field is still called `time` because it is the
 * base-column position in the row, whatever the base column happens to measure.
 */
export function buildDataViewerRawPageBounds(rows: unknown[] = [], baseKind: DataViewerBaseKind = 'time'): DataViewerRawPageBounds | null {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const distance = baseKind === 'distance';
    const toSortKey = (value: unknown) => {
        if (distance) return parseDataViewerDistanceValue(value);
        const epochMs = toEpochMs(value);
        return Number.isFinite(epochMs) ? epochMs : null;
    };
    // Time bounds stay epoch milliseconds all the way into the API so paging and tag-change
    // queries use FROM_TIMESTAMP too. Distance keeps its existing decimal-string representation.
    const toBoundValue = (sortKey: number): string | number => (distance ? formatDataViewerDistance(sortKey) : sortKey);

    const normalized = rows
        .map((row) => {
            const sortKey = toSortKey(getRawRowTimeValue(row));
            if (sortKey === null) return null;
            return {
                time: toBoundValue(sortKey),
                name: String(getRawRowNameValue(row) ?? ''),
                sortKey,
            };
        })
        .filter((row): row is { time: string | number; name: string; sortKey: number } => Boolean(row));

    if (normalized.length === 0) return null;

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    normalized.forEach((row) => {
        if (row.sortKey < min) min = row.sortKey;
        if (row.sortKey > max) max = row.sortKey;
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
            from: toBoundValue(min),
            to: toBoundValue(max),
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
    if (boundary?.time === null || boundary?.time === undefined || (typeof boundary.time === 'string' && boundary.time.trim() === '')) return { page };

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

export function formatTimeRangeLabel(from: unknown, to: unknown) {
    if ((from === '' || from == null) && (to === '' || to == null)) return 'Time range not set';
    return `${formatTimeRangeBoundaryLabel(from, 'Start')} ~ ${formatTimeRangeBoundaryLabel(to, 'End')}`;
}

export function toDataViewerTimeRangeModalValue(value: unknown) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (text.includes('now') || text.includes('last')) return text;
    const timestamp = toEpochMs(value);
    return Number.isFinite(timestamp) ? timestamp : text;
}

/** Preserve an absolute edge's hidden milliseconds when that edge was applied unchanged. */
export function preserveDataViewerTimeRangeModalEdge(original: unknown, saved: unknown, displayTimeZone = 'LOCAL') {
    const modalValue = toDataViewerTimeRangeModalValue(original);
    if (typeof modalValue !== 'number' || !Number.isFinite(modalValue)) return saved;

    const displayedText = formatDataViewerTime(modalValue, 'YYYY-MM-DD HH24:MI:SS', displayTimeZone);
    if (typeof saved === 'number') {
        if (!Number.isFinite(saved)) return saved;
        // TimeRangeModal formats the original instant to a second-resolution local string, then
        // parses that string back to an epoch value. During a DST fall-back hour that parse may
        // choose the first occurrence even when the original was the second one. Compare what the
        // two instants display as, so an untouched edge keeps its exact occurrence and milliseconds.
        const savedDisplayText = formatDataViewerTime(saved, 'YYYY-MM-DD HH24:MI:SS', displayTimeZone);
        return savedDisplayText === displayedText ? modalValue : saved;
    }

    // TimeRangeModal renders an absolute number as a local, second-resolution string and returns
    // that string on Apply. Compare against that exact display representation instead of parsing it
    // back. Besides avoiding a timezone round trip, this preserves the correct original instant in
    // a DST fall-back hour where two different timestamps have the same local clock text.
    const savedText = String(saved ?? '').trim();
    return savedText === displayedText ? modalValue : saved;
}

function formatTimeRangeBoundaryLabel(value: unknown, fallback: string) {
    const text = String(value ?? '').trim();
    if (!text) return fallback;
    if (text.includes('now') || text.includes('last')) return text;
    return formatDataViewerTime(text, 'YYYY-MM-DD HH24:MI:SS', 'LOCAL');
}

export function resolveTimeRangeInput(value: unknown, baseDate = new Date(), boundary: 'from' | 'to' = 'from') {
    const resolveRelativeDate = (date: Date) => date.getTime() + (boundary === 'to' ? 1 : 0);

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        // A numeric value is already an exact absolute edge. Re-resolving it must not move To by
        // another millisecond on every pass.
        return value;
    }

    const text = String(value ?? '').trim();
    if (!text) return '';
    if (text === 'now' || text === 'last') return resolveRelativeDate(baseDate);

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
        return resolveRelativeDate(date);
    }

    const parsed = new Date(text.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getTime();
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

/**
 * A base-column value as the chart's x coordinate.
 *
 * On a time axis that is `toEpochMs`, epoch heuristics and all. On a distance axis the number *is*
 * the coordinate and `toEpochMs` is actively wrong about it: it divides anything past 1e14 by a
 * million (a raw double bit pattern read out of a stat view is exactly that large) and hands any
 * remaining text to `Date.parse`. Refusing a value outright — NaN — is what keeps a bad reading out
 * of the series instead of plotting it somewhere in 1970.
 */
function toChartBaseX(value: unknown, baseKind: DataViewerBaseKind) {
    if (baseKind !== 'distance') return toEpochMs(value);
    const numeric = parseDataViewerDistanceValue(value);
    return numeric === null ? Number.NaN : numeric;
}

export function buildTagChartSeries(rows: Record<string, unknown>[] = [], baseKind: DataViewerBaseKind = 'time') {
    const seriesByName = new Map<string, [number, number][]>();

    rows.forEach((row) => {
        const name = String(getRawRowNameValue(row) ?? '');
        const x = toChartBaseX(getRawRowTimeValue(row), baseKind);
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
    baseKind = 'time',
}: {
    rows?: Record<string, unknown>[];
    rowsByGroup?: Record<string, Record<string, unknown>[]>;
    chartGroups?: DataViewerChartGroup[];
    baseKind?: DataViewerBaseKind;
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
            series: buildTagChartSeries(groupRows, baseKind),
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

    nextGroups.forEach((group) => {
        const id = String(group?.id || '').trim();
        if (!id) return;
        if (sourceViewRange && !nextViewRanges[id]) nextViewRanges[id] = sourceViewRange;
        if (sourceNavigatorRange && !nextNavigatorRanges[id]) nextNavigatorRanges[id] = sourceNavigatorRange;
    });

    return {
        chartViewRanges: nextViewRanges,
        chartNavigatorRanges: nextNavigatorRanges,
        splitRanges: nextSplitRanges,
    };
}

/**
 * A source panel's range as the pair "Set global time" writes to every other panel.
 *
 * The edges have to come back in the axis's own units, because what this returns is stored as the
 * page's range and read again by the next query and the next render. `Date.parse` + `toISOString`
 * is only right on a time axis: on a distance axis it turns the perfectly ordinary window 0 ~ 1000
 * into `Date.parse('0')` (the year 2000) and `Date.parse('1000')` (the year 1000) — reversed, so
 * the update is refused outright — and any window it did accept would be stored as a 1970 ISO
 * string that the next distance query cannot parse. `toChartBaseX`/`formatDataViewerChartRangeEdge`
 * are the same pair every other distance-aware path already goes through, so the edge a panel
 * emits on a wheel zoom and the edge global time writes are the same kind of value.
 */
function normalizeDataViewerGlobalTimeRange(
    range: { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown } = {},
    baseKind: DataViewerBaseKind = 'time',
) {
    const startValue = range.from ?? range.start ?? range.startTime;
    const endValue = range.to ?? range.end ?? range.endTime;
    const distance = baseKind === 'distance';
    const startTime = distance ? toChartBaseX(startValue, 'distance') : typeof startValue === 'number' ? startValue : Date.parse(String(startValue ?? ''));
    const endTime = distance ? toChartBaseX(endValue, 'distance') : typeof endValue === 'number' ? endValue : Date.parse(String(endValue ?? ''));

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return undefined;

    return {
        from: formatDataViewerChartRangeEdge(startTime, baseKind),
        to: formatDataViewerChartRangeEdge(endTime, baseKind),
    };
}

function normalizeDataViewerTagAnalyzerRangeValue(value: unknown, keyPrefix: 'start' | 'end') {
    if (value instanceof Date) {
        const time = value.getTime();
        return Number.isFinite(time) ? { [`${keyPrefix}EpochMs`]: time } : {};
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? { [`${keyPrefix}EpochMs`]: value } : {};
    }

    const text = String(value ?? '').trim();
    if (!text) return {};

    const parsed = Date.parse(text);
    if (!Number.isFinite(parsed)) return {};
    return { [`${keyPrefix}EpochMs`]: parsed };
}

/**
 * The window this page is showing, said in the vocabulary the Tag Analyzer payload expects.
 *
 * `baseKind` is a parameter and not a caller-side relabel because the two axes do not share a
 * vocabulary. A time window travels as `startEpochMs`/`endEpochMs`; a distance window travels as
 * `startValue`/`endValue` and is never date-parsed. Emitting the time vocabulary for a distance
 * window is not a cosmetic mistake: `0 ~ 1000` is a run of perfectly finite numbers, so it passes
 * every validity check on both sides and lands as 1970-01-01T00:00:00Z ~ 1970-01-01T00:00:01Z with
 * no error anywhere. That silence is the reason the distance branch exists here rather than being
 * left to the consumer to infer.
 *
 * `undefined` means "no usable window" and the caller omits `range` entirely, which is a different
 * thing from a window the consumer should reject.
 */
export function buildDataViewerTagAnalyzerRange(
    range: { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown; startIso?: unknown; endIso?: unknown; startEpochMs?: unknown; endEpochMs?: unknown; startValue?: unknown; endValue?: unknown } = {},
    baseKind: DataViewerBaseKind = 'time',
) {
    if (baseKind === 'distance') {
        const startValue = parseDataViewerDistanceValue(range.from ?? range.start ?? range.startValue);
        const endValue = parseDataViewerDistanceValue(range.to ?? range.end ?? range.endValue);
        if (startValue === null || endValue === null || endValue <= startValue) return undefined;

        return { startValue, endValue };
    }

    const start = normalizeDataViewerTagAnalyzerRangeValue(range.from ?? range.start ?? range.startTime ?? range.startIso ?? range.startEpochMs, 'start');
    const end = normalizeDataViewerTagAnalyzerRangeValue(range.to ?? range.end ?? range.endTime ?? range.endIso ?? range.endEpochMs, 'end');
    if (Object.keys(start).length === 0 || Object.keys(end).length === 0) return undefined;

    const startValue = start.startEpochMs ?? Date.parse(String(start.startIso ?? ''));
    const endValue = end.endEpochMs ?? Date.parse(String(end.endIso ?? ''));
    if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue <= startValue) return undefined;

    return {
        ...start,
        ...end,
    };
}

export function buildDataViewerTagAnalyzerTableName({
    dbName,
    userName,
    tableName,
    databaseId,
    currentUserName,
}: {
    dbName?: unknown;
    userName?: unknown;
    tableName?: unknown;
    databaseId?: unknown;
    currentUserName?: unknown;
} = {}) {
    const table = String(tableName ?? '').trim();
    const user = String(userName ?? '').trim();
    const db = String(dbName ?? '').trim();
    const rawDatabaseId = normalizeDatabaseId(databaseId);
    // A database other than the one this session is in — a mounted backup, or simply another
    // logical database on v8.7. Either way the name has to carry all three parts. The ids are
    // compared as text: a mounted database's id overflows a JS number (see `DatabaseId`), so
    // the numeric comparison this replaced could not tell two mounts apart.
    const isMountedDatabase = rawDatabaseId !== '' && rawDatabaseId !== getCurrentDatabaseId();

    if (isMountedDatabase) return [db, user, table].filter(Boolean).join('.');

    const currentUser = String(currentUserName ?? '').trim();
    if (currentUser && user && currentUser.toUpperCase() === user.toUpperCase()) return table;

    return [user, table].filter(Boolean).join('.');
}

export function buildDataViewerGlobalTimeUpdate({
    sourceGroupId,
    chartGroups = [],
    chartViewRanges = {},
    chartNavigatorRanges = {},
    chartResults = {},
    baseKind = 'time',
}: {
    sourceGroupId?: string;
    chartGroups?: DataViewerChartGroup[];
    chartViewRanges?: Record<string, { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown }>;
    chartNavigatorRanges?: Record<string, { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown }>;
    chartResults?: Record<string, { range?: { from?: unknown; to?: unknown; start?: unknown; end?: unknown; startTime?: unknown; endTime?: unknown } }>;
    baseKind?: DataViewerBaseKind;
} = {}) {
    if (!sourceGroupId || chartGroups.length <= 1) return undefined;

    const sourceGroup = chartGroups.find((group) => group?.id === sourceGroupId);
    if (!sourceGroup) return undefined;

    const displayRange =
        normalizeDataViewerGlobalTimeRange(chartViewRanges?.[sourceGroupId], baseKind) ||
        normalizeDataViewerGlobalTimeRange(chartResults?.[sourceGroupId]?.range, baseKind) ||
        normalizeDataViewerGlobalTimeRange(sourceGroup.range, baseKind);
    const navigatorRange =
        normalizeDataViewerGlobalTimeRange(chartNavigatorRanges?.[sourceGroupId], baseKind) ||
        normalizeDataViewerGlobalTimeRange(chartResults?.[sourceGroupId]?.range, baseKind) ||
        normalizeDataViewerGlobalTimeRange(sourceGroup.range, baseKind) ||
        displayRange;

    if (!displayRange || !navigatorRange) return undefined;

    type GlobalTimeRangeEdges = { from: string | number; to: string | number };
    const splitRanges: Record<string, GlobalTimeRangeEdges> = {};
    const viewRanges: Record<string, GlobalTimeRangeEdges> = {};
    const navigatorRanges: Record<string, GlobalTimeRangeEdges> = {};
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
// The legend is `type: 'scroll'`, and a horizontal scroll legend never wraps — it lays every entry
// out on one line and pages the overflow away behind its own ‹ 1/5 › control. So its height is one
// row's, whatever the series count is. This used to be computed as `ceil(series.length / 4)` rows,
// which is what a *wrapping* legend would need: at 30 tags it reserved 8 rows, pushed the plot down
// by 126px and clipped its height to the 96px floor, so the panel drew a single-row legend, a wide
// band of nothing under it, and a chart squashed into the bottom third of the card.
const PANEL_LEGEND_HEIGHT = PANEL_MAIN_TOP_WITH_LEGEND - PANEL_LEGEND_TOP - 8;
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

export function buildDataViewerChartXAxis(
    points: Array<[number, number] | { x?: number }> = [],
    range: { from?: unknown; to?: unknown } = {},
    baseKind: DataViewerBaseKind = 'time',
) {
    const rangeFrom = toChartBaseX(range.from, baseKind);
    const rangeTo = toChartBaseX(range.to, baseKind);

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
        // Every branch of `chooseTimeTickInterval` is a duration (a second, an hour, 90 days), which
        // is not a quantity a distance axis has. ECharts' own `value` axis picks its ticks, so the
        // honest answer here is "no opinion" rather than a span of milliseconds relabelled.
        tickInterval: baseKind === 'distance' ? undefined : chooseTimeTickInterval(axisMax - axisMin),
    };
}

/**
 * The compact suffixes this chart writes. Shared by both axes so one panel never labels its two
 * axes in two different notations.
 *
 * `B` rather than the SI `G`: these are the short-scale suffixes the y axis has always written, and
 * matching the axis beside it matters more here than matching the SI table.
 */
const COMPACT_NUMBER_UNITS = [
    { value: 1_000_000_000_000, suffix: 'T' },
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
];

/**
 * The reading past which the suffixes run out.
 *
 * `T` is the largest suffix in the table, so it is asked to carry everything above it, and it stops
 * being an abbreviation the moment the value it is dividing exceeds it by more than a thousandfold.
 * At 8e35 the label became `800,000,000,000,000,000,000,000T` — thirty-odd characters of a scale
 * nobody can read, on an axis whose whole job is to be scanned.
 */
const COMPACT_NUMBER_CEILING = 1000 * COMPACT_NUMBER_UNITS[0].value;

/** How fine the plain, unsuffixed label goes. Its reciprocal is the smallest reading it can state. */
const Y_AXIS_MAX_FRACTION_DIGITS = 4;

/**
 * The reading below which the plain label runs out, which is the same failure upside down.
 *
 * Four decimals is the finest a label without a suffix is written, so 0.0001 is the smallest
 * reading it can state and everything under it rounds to `0`. A tag living at 1e-5 therefore draws
 * a line that visibly rises and falls beside an axis labelled `0 0 0 0 0` — the ticks are all
 * different and every label says they are the same.
 *
 * The ceiling failed by printing digits nobody can count; this fails by printing none at all. Both
 * are the label refusing to state the scale it is on.
 */
const COMPACT_NUMBER_FLOOR = 10 ** -Y_AXIS_MAX_FRACTION_DIGITS;

/**
 * A reading outside the range the suffixes and decimals cover, written the way such readings are.
 *
 * Rounded first and re-parsed second so the mantissa carries the digits asked for and no more:
 * `toExponential` alone pads to the requested width, and `8.0e+35` is the same claim as `8e+35`
 * made two characters longer.
 */
function formatBeyondCompactRange(value: number, maximumFractionDigits: number) {
    return Number(value.toExponential(maximumFractionDigits)).toExponential();
}

function formatYAxisLabel(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const normalized = Object.is(numeric, -0) ? 0 : numeric;
    const abs = Math.abs(normalized);
    // Zero is excluded from the floor by `abs > 0`, and deliberately: it is the one reading `0` is
    // the whole truth about, and `0e+0` would be a worse way to say it.
    if (abs >= COMPACT_NUMBER_CEILING || (abs > 0 && abs < COMPACT_NUMBER_FLOOR)) return formatBeyondCompactRange(normalized, 1);
    // Per value, not per axis: a y axis is handed no window, so each label answers for itself.
    const unit = COMPACT_NUMBER_UNITS.find((item) => abs >= item.value);
    if (!unit) return new Intl.NumberFormat('en-US', { maximumFractionDigits: Y_AXIS_MAX_FRACTION_DIGITS }).format(normalized);
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(normalized / unit.value)}${unit.suffix}`;
}

function getPanelRange(
    points: Array<[number, number | null]> = [],
    timeRange: { from?: unknown; to?: unknown; startTime?: unknown; endTime?: unknown } = {},
    baseKind: DataViewerBaseKind = 'time',
) {
    const axis = buildDataViewerChartXAxis(
        points as Array<[number, number]>,
        {
            from: timeRange.startTime ?? timeRange.from,
            to: timeRange.endTime ?? timeRange.to,
        },
        baseKind,
    );
    // The fallback is what an empty chart shows. `now - 1h .. now` is a clock reading, so on a
    // distance axis it would open the panel eighteen digits away from every point the table holds;
    // the axis's own default window is the only span that means anything there.
    const now = Date.now();
    const fallbackStart = baseKind === 'distance' ? Number(DEFAULT_DATA_VIEWER_DISTANCE_RANGE.from) : now - HOUR_MS;
    const fallbackEnd = baseKind === 'distance' ? Number(DEFAULT_DATA_VIEWER_DISTANCE_RANGE.to) : now;
    return {
        startTime: Number.isFinite(axis.min) ? axis.min : fallbackStart,
        endTime: Number.isFinite(axis.max) ? axis.max : fallbackEnd,
    };
}

export function getDataViewerChartRangeMs(
    points: Array<[number, number | null]> = [],
    timeRange: { from?: unknown; to?: unknown; startTime?: unknown; endTime?: unknown } = {},
    baseKind: DataViewerBaseKind = 'time',
) {
    return getPanelRange(points, timeRange, baseKind);
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
    baseKind = 'time',
}: {
    direction?: 'backward' | 'forward';
    currentRange?: DataViewerChartRangeMs;
    navigatorRange?: DataViewerChartRangeMs;
    baseKind?: DataViewerBaseKind;
} = {}) {
    const currentStart = Number(currentRange.startTime);
    const currentEnd = Number(currentRange.endTime);
    const navigatorStart = Number(navigatorRange.startTime);
    const navigatorEnd = Number(navigatorRange.endTime);
    if (![currentStart, currentEnd, navigatorStart, navigatorEnd].every(Number.isFinite)) return null;
    if (currentEnd <= currentStart || navigatorEnd <= navigatorStart) return null;

    const shiftDirection = direction === 'backward' ? -1 : direction === 'forward' ? 1 : 0;
    if (shiftDirection === 0) return null;

    const offset = (navigatorEnd - navigatorStart) * PANEL_MAIN_RANGE_SHIFT_FRACTION * shiftDirection;
    const nextStart = currentStart + offset;
    const nextEnd = currentEnd + offset;
    const nextNavigatorStart = navigatorStart + offset;
    const nextNavigatorEnd = navigatorEnd + offset;

    if (nextEnd <= nextStart || nextNavigatorEnd <= nextNavigatorStart) return null;

    return {
        range: {
            from: formatDataViewerChartRangeEdge(nextStart, baseKind),
            to: formatDataViewerChartRangeEdge(nextEnd, baseKind),
        },
        navigatorRange: {
            from: formatDataViewerChartRangeEdge(nextNavigatorStart, baseKind),
            to: formatDataViewerChartRangeEdge(nextNavigatorEnd, baseKind),
        },
    };
}

/**
 * The range chip's chevrons: the whole window, moved by its own width.
 *
 * Deliberately not `buildDataViewerShiftMainRangeUpdate`. That one moves a *panel* view inside a
 * wider navigator extent — it needs both ranges, moves by a fraction of the navigator, and has
 * nothing to say when there is no navigator. The chip has no navigator: the window on the toolbar is
 * the only extent there is, and "previous" means the adjacent window of the same width, the way the
 * dashboard's range chips step. So the offset is the span itself, not a fraction of something else.
 *
 * Both axes go through `toChartBaseX` in and `formatDataViewerChartRangeEdge` out, which is what
 * keeps the distance case numeric: `new Date(1000)` would store `1970-01-01T00:00:01.000Z` and the
 * next render would read a window 1000 metres wide as one second of 1970.
 */
export function buildDataViewerShiftBaseRangeUpdate({
    direction,
    range = {},
    baseKind = 'time',
}: {
    direction?: 'backward' | 'forward';
    range?: { from?: unknown; to?: unknown };
    baseKind?: DataViewerBaseKind;
} = {}): { from: string | number; to: string | number } | null {
    const shiftDirection = direction === 'backward' ? -1 : direction === 'forward' ? 1 : 0;
    if (shiftDirection === 0) return null;

    const start = toChartBaseX(range.from, baseKind);
    const end = toChartBaseX(range.to, baseKind);
    if (![start, end].every(Number.isFinite)) return null;

    // A zero-width or reversed window has no width to step by, so there is no adjacent window to
    // move to. Refusing is what keeps a chevron from silently doing nothing *and* rewriting the
    // range to the same two values, which would still cost a re-query.
    const span = end - start;
    if (!(span > 0)) return null;

    const offset = span * shiftDirection;
    return {
        from: formatDataViewerChartRangeEdge(start + offset, baseKind),
        to: formatDataViewerChartRangeEdge(end + offset, baseKind),
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

export function buildDataViewerDragRangeUpdate({
    mode,
    dragStartTime,
    dragEndTime,
    currentRange = {},
    navigatorRange = {},
}: {
    mode?: 'zoom-in' | 'pan' | 'zoom-out';
    dragStartTime?: unknown;
    dragEndTime?: unknown;
    currentRange?: DataViewerChartRangeMs;
    navigatorRange?: DataViewerChartRangeMs;
} = {}) {
    const currentStart = Number(currentRange.startTime);
    const currentEnd = Number(currentRange.endTime);
    const navigatorStart = Number(navigatorRange.startTime);
    const navigatorEnd = Number(navigatorRange.endTime);
    const dragStart = Number(dragStartTime);
    const dragEnd = Number(dragEndTime);
    if (![currentStart, currentEnd, navigatorStart, navigatorEnd, dragStart, dragEnd].every(Number.isFinite)) return undefined;
    if (currentEnd <= currentStart || navigatorEnd <= navigatorStart || dragStart === dragEnd) return undefined;

    const currentSpan = currentEnd - currentStart;
    const navigatorSpan = navigatorEnd - navigatorStart;
    let nextStart: number;
    let nextEnd: number;

    if (mode === 'zoom-in') {
        nextStart = Math.max(Math.min(dragStart, dragEnd), navigatorStart);
        nextEnd = Math.min(Math.max(dragStart, dragEnd), navigatorEnd);
    } else if (mode === 'pan') {
        if (currentSpan >= navigatorSpan) return undefined;
        const offset = dragStart - dragEnd;
        nextStart = currentStart + offset;
        nextEnd = currentEnd + offset;
    } else if (mode === 'zoom-out') {
        if (currentSpan >= navigatorSpan) return undefined;
        const dragSpan = Math.abs(dragEnd - dragStart);
        const nextSpan = Math.min(currentSpan + dragSpan, navigatorSpan);
        const center = Math.min(Math.max((dragStart + dragEnd) / 2, navigatorStart), navigatorEnd);
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

    if (nextEnd <= nextStart || isSameDataViewerChartRange({ startTime: nextStart, endTime: nextEnd }, currentRange)) return undefined;
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

function buildNeoLikeTooltipFormatter(params: any, timeFormat: string, timeZone: string, baseKind: DataViewerBaseKind = 'time') {
    const items = (Array.isArray(params) ? params : [params]).filter((item) => String(item?.seriesId || '').startsWith(PANEL_MAIN_SERIES_ID_PREFIX));
    if (items.length === 0) return '';
    const firstValue = Array.isArray(items[0].value) ? items[0].value : [];
    // The heading is the x coordinate the pointer is on, which is a distance on a distance axis.
    // Routing it through the axis-aware formatter is what keeps a date out of the tooltip.
    const time = formatDataViewerBaseValue(Number(firstValue[0] ?? items[0].axisValue), baseKind, timeFormat, timeZone);
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
    baseKind = 'time',
    // Tag-name keyed colours, so a split panel keeps the colour the tag has in the main chart.
    // `color: PANEL_COLORS` below only decides a panel's *own* palette order, and a split panel
    // holds exactly one series — so without this map every split panel takes the palette's first
    // entry and comes out the same blue as every other one, and none of them matches the tag's
    // line in the main chart or its dot in the raw grid. Falls back to this panel's own palette
    // position for names the map does not cover.
    seriesColors = {},
}: {
    series?: Array<{ name: string; data: Array<[number, number | null]> }>;
    timeRange?: { from?: unknown; to?: unknown };
    displayRange?: { from?: unknown; to?: unknown };
    timeFormat?: string;
    timeZone?: string;
    baseKind?: DataViewerBaseKind;
    seriesColors?: Record<string, string>;
} = {}) {
    const colorFor = (item: { name?: unknown } | undefined, index: number) => seriesColors[String(item?.name ?? '')] || PANEL_COLORS[index % PANEL_COLORS.length];
    const allPoints = series.flatMap((item) => (Array.isArray(item?.data) ? item.data : []));
    const panelRange = getPanelRange(allPoints, displayRange || timeRange, baseKind) as Required<DataViewerChartRangeMs>;
    const navigatorRange = getPanelRange(allPoints, timeRange, baseKind) as Required<DataViewerChartRangeMs>;
    const yAxisRange = getYAxisRange(series, panelRange);
    // A `time` axis interprets every x as an epoch — it would lay 0 .. 999990 out across the first
    // sixteen minutes of 1970 and label the ticks with clock times. `value` is the same axis the
    // dashboards switch to for a non-DATETIME base column (see `DashboardChartOptionParser`), and it
    // reads the numbers as the distances they are. All three x axes switch together: the main axis
    // and the two navigator axes plot the same series, so a split would put the navigator's window
    // in a different coordinate space than the panel it scrolls.
    const distanceBase = baseKind === 'distance';
    const baseAxisType = distanceBase ? 'value' : 'time';
    // Both branches are handed the window, not just the value: on either axis the tick's useful
    // resolution is a property of how much ground the panel is covering, and only the caller knows
    // that. Zooming in is what earns a distance tick its decimals back.
    const formatBaseAxisLabel = (value: unknown) =>
        distanceBase
            ? formatDataViewerAxisDistance(value, { min: panelRange.startTime, max: panelRange.endTime })
            : formatDataViewerAxisTime(value, { min: panelRange.startTime, max: panelRange.endTime }, timeZone);

    return {
        backgroundColor: '#252525',
        animation: false,
        textStyle: { fontFamily: 'Open Sans, Helvetica, Arial, sans-serif' },
        color: PANEL_COLORS,
        grid: [
            { id: 'panel-main-grid', left: PANEL_GRID_SIDE, right: PANEL_GRID_SIDE, top: PANEL_MAIN_TOP_WITH_LEGEND, height: PANEL_MAIN_HEIGHT, containLabel: true },
            { id: 'panel-navigator-grid', left: PANEL_NAVIGATOR_GRID_SIDE, right: PANEL_NAVIGATOR_GRID_SIDE, bottom: PANEL_GRID_BOTTOM, height: PANEL_SLIDER_HEIGHT },
        ],
        legend: {
            show: true,
            type: 'scroll',
            left: 10,
            right: 10,
            top: PANEL_LEGEND_TOP,
            height: PANEL_LEGEND_HEIGHT,
            itemGap: 15,
            textStyle: { color: '#e7e8ea', fontSize: 10 },
            // ECharts' defaults for the pager are ink-on-white — a #2f4554 arrow, a #aaa disabled
            // arrow and #333 text — and this panel's background is #252525, so on a chart with more
            // tags than fit on one line the only control that reveals the rest of them was all but
            // invisible. These are the legend's own text colour for the live parts and a mid grey
            // for the end-of-range arrow, which is the same contrast pairing the rest of the panel
            // uses.
            pageIconColor: '#e7e8ea',
            pageIconInactiveColor: '#61646b',
            pageIconSize: 11,
            pageTextStyle: { color: '#e7e8ea', fontSize: 10 },
        },
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
            formatter: (params: any) => buildNeoLikeTooltipFormatter(params, timeFormat, timeZone, baseKind),
        },
        xAxis: [
            {
                id: 'panel-main-x-axis',
                type: baseAxisType,
                gridIndex: 0,
                min: panelRange.startTime,
                max: panelRange.endTime,
                axisLine: AXIS_LINE_STYLE,
                axisTick: AXIS_LINE_STYLE,
                axisLabel: {
                    ...PANEL_AXIS_LABEL_STYLE,
                    formatter: formatBaseAxisLabel,
                },
                splitLine: { show: true, lineStyle: AXIS_SPLIT_LINE_STYLE },
                axisPointer: { label: { show: false } },
            },
            {
                id: 'panel-navigator-x-axis',
                type: baseAxisType,
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
                type: baseAxisType,
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
                lineStyle: { width: 1, color: colorFor(item, index), opacity: 1 },
                itemStyle: { color: colorFor(item, index), opacity: 1 },
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
                lineStyle: { width: 1, color: colorFor(item, index), opacity: 0.85 },
                itemStyle: { color: colorFor(item, index), opacity: 0.85 },
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
        // `hour12: false` is not the same as a 0-23 clock: older ICU builds resolve it against the
        // locale's preferred cycle, and en-CA prefers h12, so midnight prints as `24:05` there and
        // `00:05` on newer runtimes. Ask for h23 directly so the hour reads the same on every Node.
        hourCycle: 'h23',
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

/**
 * How many decimals a distance tick is worth, given the window it is labelling.
 *
 * The same reasoning the time axis already uses: it drops to `MM-DD` once the window passes a
 * month, because a clock time is noise at that scale. A distance axis has the same problem in a
 * different unit. Across a 1000-unit window a tick is placed every hundred units, so digits past
 * the decimal point describe nothing a reader can see, and the axis minimum — which is a real data
 * boundary, not a round number — prints its full stored precision beside neatly rounded neighbours.
 *
 * Roughly ten labelled ticks fit across a panel, so the interval is a tenth of the window, and one
 * digit finer than that interval keeps neighbouring ticks distinct without printing noise. Capped
 * at six, which is past any distance a sensor reports and short of float dust.
 */
function resolveDistanceAxisDecimals(span: unknown) {
    const numericSpan = Math.abs(Number(span));
    if (!Number.isFinite(numericSpan) || numericSpan <= 0) return 3;

    const step = numericSpan / 10;
    return Math.min(6, Math.max(0, Math.ceil(-Math.log10(step)) + 1));
}

/**
 * The suffix the whole distance axis writes, chosen once for the axis.
 *
 * Chosen for the axis and not per value, which is the difference between an axis and a column of
 * unrelated numbers. Picking per value puts `0.1K` next to `100K` on one axis, or leaves the axis
 * minimum bare while its neighbours carry a suffix — the reader then has to check the suffix on
 * every tick before comparing two of them.
 *
 * It is the window's *magnitude* that decides, not its span. Those come apart exactly when a wide
 * odometer is read closely: a window of 996,633 ~ 998,039 spans only 1,406, so a span-driven choice
 * finds nothing worth compacting and prints seven digits per tick — while the numbers being printed
 * are plainly million-scale. How long the labels are is a property of how large the readings are.
 *
 * The `10 ×` threshold is what stops the suffix from arriving before it helps. Readings that only
 * just reach 1000 would technically fit `K`, but their ticks are then `0.1K 0.2K 0.3K` — longer
 * than the `100 200 300` they replaced, and less legible. Requiring ten units of headroom means the
 * suffix appears only once the whole-number part survives it.
 */
function resolveDistanceAxisUnit(magnitude: unknown) {
    const numericMagnitude = Math.abs(Number(magnitude));
    if (!Number.isFinite(numericMagnitude)) return undefined;
    return COMPACT_NUMBER_UNITS.find((item) => numericMagnitude >= 10 * item.value);
}

/**
 * A distance axis tick.
 *
 * ECharts divides a `value` axis into intervals in floating point, so a tick that is conceptually
 * 200 arrives as 199.99999999999997. Rounding to the window's own resolution lands it back on the
 * number the axis meant, and does the same for the axis minimum, which arrives as whatever the data
 * actually starts at.
 *
 * The result is re-parsed rather than left as `toFixed` output so a whole tick reads `200` and not
 * `200.00`: the decimal count is a ceiling on precision, not a demand for it.
 *
 * The two questions the window answers are separate. Its magnitude picks the suffix — how large the
 * readings are — and its span picks the decimals — how closely they are being read. A wide odometer
 * inspected over a few metres needs both answers at once, and either one alone gets it wrong.
 *
 * The decimals are resolved against the *scaled* span, so the suffix cannot cost resolution: a
 * 15,000-unit window keeps its ticks apart as `1.5K 3K 4.5K` rather than collapsing them to `2K 3K
 * 5K`. Scaling the span and the value by the same unit is the whole of it.
 *
 * `window` is optional because a formatter with no window to consult is better than no labels; it
 * falls back to three decimals and no suffix.
 */
export function formatDataViewerAxisDistance(value: unknown, window?: { min?: unknown; max?: unknown }) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return formatDataViewerDistance(value);

    // Zero is the one tick that reads the same in every unit, and `0K` beside `10K` only invites
    // the reader to wonder whether it means something other than nothing.
    if (numeric === 0) return '0';

    const min = Number(window?.min);
    const max = Number(window?.max);
    const span = Math.abs(max - min);

    // Past the last suffix the same reasoning as the y axis applies. This axis degrades differently
    // — `String(Number(...))` reaches for exponential on its own, giving `8e+23T` — but a mantissa
    // wearing a suffix abbreviates nothing, and the two axes should not disagree about it.
    if (Math.abs(numeric) >= COMPACT_NUMBER_CEILING) return formatBeyondCompactRange(numeric, resolveDistanceAxisDecimals(span));

    const unit = resolveDistanceAxisUnit(Math.max(Math.abs(min), Math.abs(max)));
    if (!unit) return String(Number(numeric.toFixed(resolveDistanceAxisDecimals(span))));

    const decimals = resolveDistanceAxisDecimals(span / unit.value);
    return `${String(Number((numeric / unit.value).toFixed(decimals)))}${unit.suffix}`;
}

export function formatDataViewerNavigatorRangeLabels(
    range: { startTime?: unknown; endTime?: unknown; from?: unknown; to?: unknown } = {},
    _timeFormat = DEFAULT_TIME_FORMAT,
    timeZone = DEFAULT_TIME_ZONE,
    baseKind: DataViewerBaseKind = 'time',
) {
    const startTime = toChartBaseX(range.startTime ?? range.from, baseKind);
    const endTime = toChartBaseX(range.endTime ?? range.to, baseKind);
    return {
        start: Number.isFinite(startTime) ? formatDataViewerBaseValue(startTime, baseKind, 'YYYY-MM-DD HH24:MI:SS', timeZone) : '',
        end: Number.isFinite(endTime) ? formatDataViewerBaseValue(endTime, baseKind, 'YYYY-MM-DD HH24:MI:SS', timeZone) : '',
    };
}

/**
 * A chart x coordinate as the range edge the page stores.
 *
 * Every interaction — wheel, drag, slider, the shift arrows — hands back a pair of axis coordinates
 * that the page writes straight back as `{ from, to }` and the next render reads in again. On a time
 * axis that pair is epoch milliseconds and the stored form is ISO. On a distance axis it is a
 * distance: `new Date(999990).toISOString()` would store `1970-01-01T00:16:39.990Z`, the next render
 * would parse it as an epoch, and the panel would jump to 1970 the moment anyone touched it.
 */
export function formatDataViewerChartRangeEdge(value: unknown, baseKind: DataViewerBaseKind = 'time'): string | number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    return baseKind === 'distance' ? numeric : new Date(numeric).toISOString();
}
