import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useEsc from '@/hooks/useEsc';
import { useSearchParams } from 'react-router-dom';
import { TableVirtuoso, type TableComponents } from 'react-virtuoso';
import { useSetRecoilState } from 'recoil';
import {
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
    MdRefresh,
    VscChevronDown,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import NeoTimeRangeModal from '@/components/modal/TimeRangeModal';
import { TimeZoneModal as NeoTimeZoneModal } from '@/components/modal/TimeZoneModal';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { createTagAnalyzerBoardFromPayload } from '@/components/tagAnalyzer/integration';
import TagEChart, { type DataViewerTimeRange } from './TagEChart';
import { getUserName } from '@/utils';
import {
    DataViewerAssetHierarchy,
    DataViewerColumnRow,
    DataViewerTag,
    listTableColumns,
    listTableTags,
    queryTagBaseColumnBounds,
    queryTagBoundaryTime,
    queryTagData,
    queryTagDataTotal,
} from './dataViewerApi';
import JsonKeyPickerModal, { type JsonKeyPickerView } from './JsonKeyPickerModal';
import RawRowDetailModal from './RawRowDetailModal';
import TextValueModal from './TextValueModal';
import { writeClipboard } from './writeClipboard';
import JsonKeyDetailModal from './JsonKeyDetailModal';
import { isJsonKeyDocument, jsonKeyDocumentHasKeys } from './jsonKeyTree';
import { toTagAnalyzerJsonKeyPath } from '@/utils/jsonKeyCatalog';
import {
    DEFAULT_DATA_VIEWER_ROWS_PER_TAG,
    DEFAULT_TIME_FORMAT,
    DEFAULT_TIME_ZONE,
    buildAssetTreeRows,
    buildDataViewerChartGroups,
    buildDataViewerChartResultsFromRawRows,
    buildDataViewerGlobalTimeUpdate,
    buildDataViewerTagAnalyzerRange,
    buildDataViewerTagAnalyzerTableName,
    buildDataViewerHeaderLabels,
    buildDataViewerDefaultChartShiftRawPageUpdate,
    buildDataViewerRawPageBounds,
    buildDataViewerRawPageRequest,
    buildDataViewerRawRowsPerTagChange,
    buildDataViewerSplitRangeUpdate,
    buildDataViewerSplitGroups,
    buildDataViewerShiftBaseRangeUpdate,
    buildDataViewerShiftMainRangeUpdate,
    buildDataViewerDistanceSliderClickRange,
    buildDataViewerTagSelectionUpdate,
    buildDataViewerColumnSpecs,
    buildDataViewerExtraProjection,
    buildDataViewerGridColumns,
    dataViewerColumnTypeLabel,
    buildRawColumnWidths,
    buildRawResultColumns,
    buildRawRowNameColors,
    buildSeriesColorMap,
    formatDataViewerTimeRangeInput,
    filterDataViewerTags,
    filterVisibleAssetRows,
    formatDataViewerBaseRangeLabel,
    formatDataViewerBaseValue,
    formatDataViewerDistance,
    formatDataViewerTime,
    getDataViewerBaseAxisLabel,
    getDataViewerDefaultRange,
    getDataViewerRawPageSize,
    getTimeFormatLabel,
    getTimeZoneLabel,
    hasDataViewerRawNextPage,
    isDataViewerJsonValueColumn,
    isDataViewerRangeReversed,
    normalizeSelectedTagNames,
    resolveDataViewerBaseColumn,
    resolveDataViewerBaseColumnType,
    resolveDataViewerBaseKind,
    type DataViewerColumnSpec,
    type DataViewerGridColumn,
    resolveTimeRangeInput,
    snapDataViewerDistanceEdge,
    toDataViewerDate,
} from './dataViewerModel';
import {
    buildDistanceQuickWindowExpression,
    buildDistanceTickValues,
    clampDistance,
    formatDistanceReadout,
    formatDistanceAxisLabel,
    isDistanceAnchorEdge,
    resolveDistanceEdge,
    thinDistanceTicks,
    DISTANCE_QUICK_WINDOWS,
    DISTANCE_THUMB_GRAB_PX,
    DISTANCE_THUMB_WIDTH,
} from '@/utils/distanceRange';
import './DataViewerPage.scss';

type ResultRow = Record<string, unknown>;
type RawPageRequest = {
    page: number;
    from?: string;
    to?: string;
    boundedRange?: boolean;
    cursorSide?: 'next' | 'prev';
    cursorTime?: string;
    cursorName?: string;
    cursorOffset?: number;
};

const getParam = (params: URLSearchParams, key: string) => params.get(key)?.trim() ?? '';

// Every read is bounded on both edges, so the range the user types is only ever an *expression*:
// `last-1h ~ last` means "one hour back from this tag's newest sample". Resolving it per query would
// slide the window under the user's feet between page 1 and page 2, so it is resolved once into a
// FrozenWindow and every subsequent read — including paging — reuses that literal timestamp pair.
// `key` records the inputs the window was resolved from; when it stops matching the current inputs
// the window is stale and no query goes out until the resolver has produced a fresh one.
type FrozenWindow = { from: string; to: string; key: string };

// Both edges are mandatory: an open edge is exactly the unbounded scan the frozen window exists to
// prevent. The shared TimeRangeModal still allows an empty side (dashboards rely on it), so the
// rule is enforced here, on the Data Viewer's own apply path.
const TIME_RANGE_REQUIRED_MESSAGE = 'Time range requires both From and To.';
const TIME_RANGE_INVALID_MESSAGE = 'Please check the entered time.';
const TIME_RANGE_ORDER_MESSAGE = 'From should be earlier than To.';
const TAG_HAS_NO_DATA_MESSAGE = 'The selected tag has no data to anchor the time range to.';
// The same three rules, said in the axis's own vocabulary. A distance window is bounded on both
// edges for the identical reason a time window is, but "check the entered time" would send someone
// looking for a clock on a table that has an odometer.
const DISTANCE_RANGE_REQUIRED_MESSAGE = 'Distance range requires both From and To.';
const DISTANCE_RANGE_INVALID_MESSAGE = 'Distance range accepts numbers, or first / last (e.g. last-5000).';
const DISTANCE_RANGE_ORDER_MESSAGE = 'From should be smaller than To.';
// A JSON value column holds a document, not a scalar. Raw is unaffected — the grid prints the
// document as text, which is exactly what someone reading a JSON column wants to see. What breaks
// is everything that needs a *number*: the chart plots NaN, and Tag Analyzer aggregates (avg/min/
// max) over the same non-numeric column. So those two doors are the ones that close, and this is
// what they say when asked why. See `isDataViewerJsonValueColumn`.
const NO_NUMERIC_COLUMN_BLOCK_REASON = 'Unavailable: this table has no numeric column to chart or analyze.';

// A key is a number once it has been projected out of the document, and the average is Tag
// Analyzer's own default for a numeric series.
/**
 * How much text a grid cell can carry before the row stops being able to show it.
 *
 * Not a layout measurement — the column widths are measured, and a value under this length is
 * ellipsised at worst. It is the point past which "read it here" stops being true, which is when
 * the cell earns a control to open it somewhere it can be read whole.
 */
const RAW_TEXT_CELL_EXPAND_CHARS = 60;

/** How long a cell's copy button says it copied. Matches the row inspector's own hint. */
const RAW_CELL_COPY_HINT_MS = 1600;

/** A value the grid's one line cannot hold: too long, or carrying lines of its own. */
const isExpandableTextCell = (text: string) => text.length > RAW_TEXT_CELL_EXPAND_CHARS || text.includes('\n');

const TAG_ANALYZER_JSON_CALCULATION_MODE = 'avg';

// `rawPageRequest` is a dependency of `fetchRows`, so a fresh `{ page: 1 }` object is a fresh
// identity and re-fires the row query even when nothing about the request changed. Several places
// reset the page and the page-reset effect resets it again right after them, which fired the exact
// same query twice — visible with `now`, where the window resolves without a boundary round-trip so
// both runs find a window to query with. Collapsing an already-first-page request to the identical
// object makes the second reset a no-op.
const FIRST_PAGE_REQUEST: RawPageRequest = { page: 1 };
const toFirstPageRequest = (current: RawPageRequest): RawPageRequest =>
    current.page === 1 && current.from === undefined && current.cursorSide === undefined ? current : FIRST_PAGE_REQUEST;

/**
 * The identity of the inputs an asynchronous read was made from.
 *
 * Every read this page makes *about a table* — the schema, the tag list — stores the key it was
 * aimed at alongside its result, and freshness is decided during render by comparing that key with
 * the key of the inputs on screen right now (see `tableReadsPending`). This is the same device as
 * `buildFrozenWindowKey` below, for the same reason: the alternative — blanking the result from an
 * effect when the inputs change — leaves one commit where the inputs are already the new table's
 * and the result is still the previous table's, and a query fired from that commit carries a
 * mixture of the two that describes no table at all.
 */
const buildDataViewerReadKey = (...parts: unknown[]) => parts.map((part) => String(part ?? '')).join('\u0000');

const buildFrozenWindowKey = (range: DataViewerTimeRange, selectedTagKey: string, refreshToken: number) =>
    [String(range.from ?? ''), String(range.to ?? ''), selectedTagKey, refreshToken].join('\u0000');

// Must stay in sync with `.data-viewer-raw-table th, td { height: 25px }` (DataViewerPage.scss).
// `.neo-data-viewer *` sets `box-sizing: border-box`, so the 1px bottom border is inside the
// 25px — the measured row box really is 25px, which is what the virtualiser needs.
const RAW_ROW_HEIGHT = 25;

// Must match `.data-viewer-raw-table { font-size: 14px }` (DataViewerPage.scss) — the canvas
// probe below measures at this size, so a mismatch would skew every column width.
const RAW_CELL_FONT_SIZE = 14;
// The name cell's colour dot plus its margin, which the column has to fit alongside the text.
const RAW_NAME_DOT_SPACE = 15;

function MaterialIcon({ name, className = '' }: { name: string; className?: string }) {
    return (
        <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
            {name}
        </span>
    );
}

function ResultPagination({
    page,
    pageSize,
    rowCount,
    loading,
    endLoading,
    forceNextPage = false,
    onPage,
    onEndPage,
    rowsPerTag,
    onRowsPerTagChange,
}: {
    page: number;
    pageSize: number;
    rowCount: number;
    loading: boolean;
    endLoading: boolean;
    forceNextPage?: boolean;
    onPage: (page: number) => void;
    onEndPage: () => void;
    rowsPerTag: number;
    onRowsPerTagChange: (value: string) => number;
}) {
    const [value, setValue] = useState(String(page));
    const [rowsPerTagValue, setRowsPerTagValue] = useState(String(rowsPerTag));
    const hasNextPage = hasDataViewerRawNextPage({ rowCount, pageSize, forceOpen: forceNextPage });

    useEffect(() => {
        setValue(String(page));
    }, [page]);

    useEffect(() => {
        setRowsPerTagValue(String(rowsPerTag));
    }, [rowsPerTag]);

    const go = (next: number) => {
        onPage(Math.max(1, next));
    };

    const commit = () => {
        const n = Number(value);
        if (Number.isFinite(n)) go(Math.floor(n));
        else setValue(String(page));
    };

    const commitRowsPerTag = () => {
        const next = onRowsPerTagChange(rowsPerTagValue);
        setRowsPerTagValue(String(next || rowsPerTag));
    };

    return (
        <div className="pagination">
            <button type="button" className="btn btn-sm btn-ghost" disabled={page <= 1 || loading} onClick={() => go(1)} aria-label="First page">
                <MdKeyboardDoubleArrowLeft className="icon-sm" />
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={page <= 1 || loading} onClick={() => go(page - 1)} aria-label="Previous page">
                <VscChevronLeft className="icon-sm" />
            </button>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') commit();
                }}
                className="pagination-input"
                aria-label="Current result page"
            />
            <button type="button" className="btn btn-sm btn-ghost" disabled={!hasNextPage || loading || endLoading} onClick={() => go(page + 1)} aria-label="Next page">
                <VscChevronRight className="icon-sm" />
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={!hasNextPage || loading || endLoading} onClick={onEndPage} aria-label="Move to end page" title="Move to end page">
                <MdKeyboardDoubleArrowRight className="icon-sm" />
            </button>
            <label className="pagination-page-size">
                <span>Rows / tag</span>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={rowsPerTagValue}
                    onChange={(event) => setRowsPerTagValue(event.target.value)}
                    onBlur={commitRowsPerTag}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRowsPerTag();
                    }}
                    className="pagination-input pagination-page-size-input"
                    aria-label="Rows per tag"
                    disabled={loading || endLoading}
                />
            </label>
        </div>
    );
}

function TimeRangeModal({
    range,
    onApply,
    onClose,
}: {
    range: DataViewerTimeRange;
    onApply: (range: DataViewerTimeRange) => void;
    onClose: () => void;
}) {
    return (
        <NeoTimeRangeModal
            pSetTimeRangeModal={(open) => {
                if (!open) onClose();
            }}
            pStartTime={formatDataViewerTimeRangeInput(range.from)}
            pEndTime={formatDataViewerTimeRangeInput(range.to)}
            pSetTime={() => undefined}
            pSaveCallback={(from, to) => onApply({ from: from ?? '', to: to ?? '' })}
        />
    );
}

// ─── distance-base seam (editor) ──────────────────────────────────────────────────────────────
// The distance half of the range editor: a bounded dual-thumb slider over the base column's real
// extent, a readout, a tick scale, and the From/To numeric inputs — with the same
// both-edges-required / from-before-to rules the time path enforces.
//
// The dashboard draws the same editor in `components/modal/DistanceRangeTab` — as a *tab body*
// inside the shared Modal's shell, styled with CSS modules, where this one owns its own dialog and
// takes its styling from the `.neo-data-viewer` tokens. The two are deliberately not one component
// for that reason, but they are one *editor*: every value a gesture can produce — tick values and
// labels, the readout format, the thumb metrics, the snap, the track click, the quick windows —
// comes from `@/utils/distanceRange` and nowhere else, so a drag lands on the same number in both.
//
// No date picker and no quick-range list: `last-1h` has no distance analogue, so the only thing
// there is to type is a number.

function DistanceRangeModal({
    range,
    bounds,
    onApply,
    onClose,
}: {
    range: DataViewerTimeRange;
    /** The base column's real extent, or `null` when it could not be read. `pBounds` on the shared tab. */
    bounds?: { min: number; max: number } | null;
    onApply: (range: DataViewerTimeRange) => void;
    onClose: () => void;
}) {
    const [from, setFrom] = useState(() => formatDataViewerDistance(range.from));
    const [to, setTo] = useState(() => formatDataViewerDistance(range.to));
    // Local, not the page's `error`: the modal covers the page's error box, so a rejection reported
    // there would be invisible until the user closed the very dialog that produced it.
    const [notice, setNotice] = useState('');

    const hasExtent = Boolean(bounds && Number.isFinite(bounds.min) && Number.isFinite(bounds.max) && bounds.max > bounds.min);
    // The text is the source of truth, because the text is what Apply validates. The slider is a
    // second view of the same two strings, so "1e3" or "" or "abc" stay exactly as typed and are
    // still rejected by the same three rules below.
    //
    // An edge may also be anchored to the data — `last`, `last-5000`, `first`, `first+5000`, the
    // distance answer to `last-1h ~ last`. Those are resolved against the extent for everything on
    // screen, and kept as expressions in what Apply hands back, so the window follows the data
    // instead of freezing at the coordinates it happens to sit on today.
    const resolveEdge = (value: string) => resolveDistanceEdge(value, hasExtent ? { min: bounds!.min, max: bounds!.max } : null);
    const fromValue = resolveEdge(from);
    const toValue = resolveEdge(to);
    const sliderMin = hasExtent ? bounds!.min : 0;
    const sliderMax = hasExtent ? bounds!.max : 0;
    const sliderSpan = sliderMax - sliderMin || 1;
    // An unparseable edge still has to put the thumb *somewhere*; the corresponding bound is the
    // only honest place for it, and the readout says `-` so nothing claims that guess is the value.
    const sliderFrom = hasExtent ? clampDistance(fromValue ?? sliderMin, sliderMin, sliderMax) : 0;
    const sliderTo = hasExtent ? clampDistance(toValue ?? sliderMax, sliderMin, sliderMax) : 0;
    const span = fromValue === null || toValue === null ? null : toValue - fromValue;
    // ~1/1000 of the extent, so a full drag is a smooth sweep rather than 4,828 discrete stops, and
    // never below the smallest value the axis can actually distinguish.
    const sliderStep = useMemo(() => {
        const raw = sliderSpan / 1000;
        if (!Number.isFinite(raw) || raw <= 0) return 1;
        return raw >= 1 ? Math.max(1, Math.round(raw)) : raw;
    }, [sliderSpan]);
    const tickValues = useMemo(() => (hasExtent ? buildDistanceTickValues(sliderMin, sliderMax) : []), [hasExtent, sliderMax, sliderMin]);
    // Labels sized to the tick step, and thinned when that makes them long. An odometer window of a
    // few hundred metres around 25,150,000 otherwise prints five ticks that all read the same and a
    // max label long enough to sit on its neighbour — one decimal cannot separate ticks 200 apart at
    // that magnitude. Same rule as the dashboard's editor.
    const tickStep = tickValues.length > 1 ? tickValues[1] - tickValues[0] : sliderSpan / 4;
    const tickLabel = (value: number) => formatDistanceAxisLabel(value, tickStep);
    // The upper bound is the one number here worth spelling out exactly; it only falls back to the
    // short form when spelling it out would run into the tick beside it. Exact value on hover.
    const exactMaxLabel = formatDistanceReadout(sliderMax);
    const maxTickLabel = exactMaxLabel.length > 9 ? tickLabel(sliderMax) : exactMaxLabel;
    const drawnTicks = useMemo(() => {
        const longest = tickValues.reduce((max, value) => Math.max(max, tickLabel(value).length), maxTickLabel.length);
        const edgeCut = longest > 10 ? 0.6 : longest > 6 ? 0.72 : 0.92;
        return thinDistanceTicks(
            tickValues.filter((value) => (value - sliderMin) / sliderSpan <= edgeCut),
            tickLabel
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickValues, sliderMin, sliderMax, sliderSpan, tickStep, maxTickLabel]);

    // Every value the slider produces — a pixel on the rail, an arrow key — goes through here, so a
    // continuous ratio can never reach the From box as `401578.346465`, and either bound is exactly
    // reachable however badly the step divides the extent (see `snapDataViewerDistanceEdge`).
    const snapEdge = (value: number) => snapDataViewerDistanceEdge({ value, min: sliderMin, max: sliderMax, step: sliderStep });

    // ── crossing ──────────────────────────────────────────────────────────────────────────────
    // The thumbs cross, and crossing is a *swap*: pull From past To and the two exchange roles, so
    // the thumb under the cursor keeps following it instead of stopping dead against its neighbour.
    // Nothing downstream ever sees a backwards range, because the pair is written as the min and max
    // of one moved value and one anchored one rather than as "the From edge" — `from ≤ to` is a
    // property of the two numbers, not of which thumb was grabbed.
    //
    // It is also what makes a collapsed pair reachable in both directions with no tie-break at all:
    // when the two coincide the anchor is the same number whichever thumb was named, so a pull to
    // the left lands on From and a pull to the right lands on To, by arithmetic rather than by rule.
    //
    // The typed inputs are still deliberately untouched by any of this: silently rewriting `900` to
    // `100` while someone is halfway through replacing both edges is worse than telling them, on
    // Apply, that the range came out backwards.
    const commitEdges = (moved: number, anchored: number) => {
        setFrom(String(Math.min(moved, anchored)));
        setTo(String(Math.max(moved, anchored)));
    };

    const fromThumbRef = useRef<HTMLInputElement | null>(null);
    const toThumbRef = useRef<HTMLInputElement | null>(null);

    // One edge moved from the keyboard — which is also where a native `change` on these inputs comes
    // from, the pointer being handled below. The other edge anchors; if the move crossed it, focus
    // follows the value across, so the arrows go on driving the number they were driving instead of
    // silently switching to the other one.
    const moveEdgeTo = (edge: 'from' | 'to', value: number) => {
        const anchored = edge === 'from' ? sliderTo : sliderFrom;
        const moved = snapEdge(value);
        commitEdges(moved, anchored);
        if (edge === 'from' && moved > anchored) toThumbRef.current?.focus();
        if (edge === 'to' && moved < anchored) fromThumbRef.current?.focus();
    };

    // `step="any"` on the inputs is what lets a thumb be *drawn* at a bound the step grid misses: at
    // a step of 1,000 on a 0 .. 999,990 extent the browser's own value sanitisation snaps 999,990
    // back to 999,000, and the thumb sits a visible distance short of the end of its own rail while
    // the readout claims the maximum. The cost of `any` is that the arrows would then move in some
    // UA-chosen fraction of the extent, so they are handled here: one step, or straight to a bound.
    const handleThumbKeyDown = (edge: 'from' | 'to', event: React.KeyboardEvent<HTMLInputElement>) => {
        const current = edge === 'from' ? sliderFrom : sliderTo;
        const leap = sliderStep * 10;
        const next =
            event.key === 'ArrowRight' || event.key === 'ArrowUp'
                ? current + sliderStep
                : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                  ? current - sliderStep
                  : event.key === 'PageUp'
                    ? current + leap
                    : event.key === 'PageDown'
                      ? current - leap
                      : event.key === 'Home'
                        ? sliderMin
                        : event.key === 'End'
                          ? sliderMax
                          : null;
        if (next === null) return;
        event.preventDefault();
        moveEdgeTo(edge, next);
    };

    // ── thumb dragging ────────────────────────────────────────────────────────────────────────
    // The drag is run here rather than left to the two native range inputs, because two stacked
    // inputs cannot express "whichever thumb you meant". Their thumbs are the only part of them that
    // takes a pointer, so the one painted later — To — wins every press where the two coincide, and
    // the other is unreachable underneath it. Measured in Chromium: from a collapsed pair anywhere on
    // the rail, From could never be picked up again, and a pair collapsed at the maximum could not be
    // moved at all in either direction. The slider was simply stuck.
    //
    // So the container owns the gesture: it names the nearer thumb, anchors the other, and from then
    // on the gesture is just "this value, that anchor" — which is why crossing needs no case of its
    // own here. `preventDefault` on the press is what stops the native drag underneath from running
    // the same gesture a second time.
    const sliderRef = useRef<HTMLDivElement | null>(null);
    // Everything the gesture needs, captured at the press. Only one edge moves during a drag, so the
    // other one is a constant for its duration and no state has to be re-read mid-gesture.
    const thumbDragRef = useRef<{ anchored: number } | null>(null);

    // Value → x, on the rail the thumb centre can actually reach.
    const valueToClientX = (value: number, rect: DOMRect) => {
        const inset = DISTANCE_THUMB_WIDTH / 2;
        const usable = rect.width - DISTANCE_THUMB_WIDTH;
        if (!(usable > 0)) return rect.left + rect.width / 2;
        return rect.left + inset + ((value - sliderMin) / sliderSpan) * usable;
    };
    // ...and back, snapped to the same step the keyboard moves in so the two agree.
    const clientXToValue = (clientX: number, rect: DOMRect) => {
        const inset = DISTANCE_THUMB_WIDTH / 2;
        const usable = rect.width - DISTANCE_THUMB_WIDTH;
        const ratio = usable > 0 ? (clientX - rect.left - inset) / usable : 0;
        return snapEdge(sliderMin + Math.min(Math.max(ratio, 0), 1) * sliderSpan);
    };

    useEffect(() => {
        const handleMove = (event: PointerEvent) => {
            const drag = thumbDragRef.current;
            const rect = sliderRef.current?.getBoundingClientRect();
            if (!drag || !rect || !(rect.width > 0)) return;
            event.preventDefault();
            commitEdges(clientXToValue(event.clientX, rect), drag.anchored);
        };
        const handleUp = () => {
            thumbDragRef.current = null;
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    });

    // A click on the bare track moves the whole window to the clicked point, keeping its width.
    // Without it the only way to reach 40,000 m from a window at 0 is to drag both thumbs the length
    // of the rail, one after the other, and get the width right by hand on the way.
    //
    // `pointerdown`, not `click`: a press on the track that turns into a drag would otherwise both
    // jump the window here *and* leave a click behind at the end of the gesture.
    const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!hasExtent) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!(rect.width > 0)) return;

        const fromX = valueToClientX(sliderFrom, rect);
        const toX = valueToClientX(sliderTo, rect);
        const distanceToFrom = Math.abs(event.clientX - fromX);
        const distanceToTo = Math.abs(event.clientX - toX);
        // A press that landed on one of the inputs came off its thumb — in a browser that is the
        // only part of them a pointer can reach — so it names its own edge and needs no guessing.
        const targetEdge =
            event.target instanceof HTMLInputElement
                ? event.target.classList.contains('data-viewer-distance-thumb-from')
                    ? 'from'
                    : event.target.classList.contains('data-viewer-distance-thumb-to')
                      ? 'to'
                      : undefined
                : undefined;
        const nearest = Math.min(distanceToFrom, distanceToTo) <= DISTANCE_THUMB_GRAB_PX ? (distanceToFrom <= distanceToTo ? 'from' : 'to') : undefined;
        // A press where the two coincide needs no tie-break of its own: whichever edge is named, the
        // *other* one is the same number, and the swap in `commitEdges` sorts the pair out from there
        // whichever way the gesture then goes.
        const edge = targetEdge ?? nearest;

        if (edge) {
            event.preventDefault();
            thumbDragRef.current = { anchored: edge === 'from' ? sliderTo : sliderFrom };
            return;
        }

        // Not a thumb, so nothing is being dragged — including anything a previous gesture left
        // behind if its pointerup landed somewhere that never reached us.
        thumbDragRef.current = null;
        const next = buildDataViewerDistanceSliderClickRange({
            ratio: (event.clientX - rect.left) / rect.width,
            from: sliderFrom,
            to: sliderTo,
            min: sliderMin,
            max: sliderMax,
        });
        if (!next) return;
        // Both edges, as text, through the same two states the thumbs and the inputs write — so the
        // readout, the fill and the From/To boxes all follow from this one move.
        setFrom(String(next.from));
        setTo(String(next.to));
    };

    // Whole-extent shortcuts. Only drawn when there *is* an extent: without one there is no "50% of"
    // anything, which is the same reason the slider itself is not drawn (see `hasExtent`).
    // Anchored, not frozen: `Last 25%` is the most recent quarter of the data as it stands now *and*
    // as it grows, which is what makes it the distance answer to `Last 1 hour`.
    const applyQuickWindow = (edge: 'first' | 'last', ratio: number) => {
        const next = buildDistanceQuickWindowExpression({ min: sliderMin, max: sliderMax, edge, ratio });
        if (!next) return;
        setFrom(next.from);
        setTo(next.to);
    };

    const apply = () => {
        // Both edges mandatory, checked before parsing so an empty side is reported as missing
        // rather than as "not a number" — the two are different mistakes.
        if (!from.trim() || !to.trim()) {
            setNotice(DISTANCE_RANGE_REQUIRED_MESSAGE);
            return;
        }
        if (fromValue === null || toValue === null) {
            setNotice(DISTANCE_RANGE_INVALID_MESSAGE);
            return;
        }
        if (fromValue > toValue) {
            setNotice(DISTANCE_RANGE_ORDER_MESSAGE);
            return;
        }
        // A coordinate is handed back as its number, so everything downstream — the frozen window
        // key, the SQL literal, the chip label — reads one canonical form. An anchored edge is handed
        // back as its expression, because resolving it here is exactly what it exists to avoid.
        onApply({
            from: isDistanceAnchorEdge(from) ? from.trim() : fromValue,
            to: isDistanceAnchorEdge(to) ? to.trim() : toValue,
        });
    };

    // Escape has to be listened for on the document, not on the dialog: a `onKeyDown` there only
    // fires while focus is inside it, and one click on the overlay is enough to lose that.
    // `useEsc` is the same hook the shared Modal uses, so the behaviour matches every other dialog.
    // Tracks where the current press began; see the overlay's onPointerDown below.
    const pressStartedOnOverlay = useRef(false);

    useEsc(onClose);

    // Portalled to <body>. Rendered in place, the overlay is `position: fixed` but still painted
    // inside whatever stacking context its ancestors establish, so the app shell's splitter and the
    // tag list painted over it. The wrapper keeps the `neo-data-viewer` class because every rule and
    // design token below is scoped to it; `display: contents` keeps that wrapper out of layout so it
    // does not become a stray full-height flex box on <body>.
    return createPortal(
        <div className="neo-data-viewer neo-data-viewer-portal">
            <div
                className="modal-overlay data-viewer-time-overlay"
                role="presentation"
                // `click` fires on the nearest common ancestor of press and release, so a slider drag
                // that starts on a thumb and finishes past the dialog's edge lands on the overlay and
                // used to close it mid-gesture. Only a press that *began* on the overlay counts as a
                // click-outside — the same guard the shared Modal uses (`sIsStartInner`).
                onPointerDown={(event) => {
                    pressStartedOnOverlay.current = event.target === event.currentTarget;
                }}
                onClick={(event) => {
                    if (event.target === event.currentTarget && pressStartedOnOverlay.current) onClose();
                }}
            >
                <div
                    className="modal data-viewer-time-modal data-viewer-distance-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Set distance range"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') apply();
                    }}
                >
                    <div className="modal-header data-viewer-distance-header">
                        <div className="modal-header-title">
                            <MaterialIcon name="straighten" className="icon-sm" />
                            <span>Distance</span>
                        </div>
                        <button type="button" className="btn-icon-sm data-viewer-distance-close" onClick={onClose} aria-label="Close distance range">
                            <MaterialIcon name="close" className="icon-sm" />
                        </button>
                    </div>
                    <div className="modal-body data-viewer-time-body data-viewer-distance-body">
                        {/* Two lines, not two columns: the range is the headline and the span is a
                            note about it, so the span goes *under* the range rather than beside it —
                            where, at the right-hand end of a 420px dialog, it read as a second
                            unrelated number. Block children of a block box, so the stacking is a
                            property of the markup and not of a flex direction that could be flipped
                            back without anything noticing. */}
                        <div className="data-viewer-distance-readout">
                            <div className="data-viewer-distance-readout-value">
                                {formatDistanceReadout(fromValue)}
                                <span className="data-viewer-distance-readout-dash">–</span>
                                {formatDistanceReadout(toValue)}
                            </div>
                            <div className="data-viewer-distance-readout-span">{formatDistanceReadout(span)}</div>
                        </div>

                        {/* No extent ⇒ no slider. A bounds read that failed must not cost the user the
                            editor, so the numeric inputs below carry on alone. */}
                        {hasExtent ? (
                            <>
                                <div ref={sliderRef} className="data-viewer-distance-slider" onPointerDown={handleTrackPointerDown} data-testid="data-viewer-distance-slider">
                                    <div className="data-viewer-distance-track" />
                                    <div
                                        className="data-viewer-distance-fill"
                                        style={{
                                            left: `${((sliderFrom - sliderMin) / sliderSpan) * 100}%`,
                                            width: `${Math.max(0, ((sliderTo - sliderFrom) / sliderSpan) * 100)}%`,
                                        }}
                                    />
                                    {/* Two native range inputs stacked on one track. They draw the thumbs and carry
                                        the keyboard's focus, but neither the pointer nor the keys are theirs to
                                        interpret — see `handleTrackPointerDown` for why a stacked pair cannot decide
                                        between itself, and `handleThumbKeyDown` for why `step` here is `any`: a step
                                        that does not divide the extent makes the browser sanitise a value *at* the
                                        maximum back down to the last aligned one, and the thumb then stops short of
                                        the end of its own rail. */}
                                    <input
                                        ref={fromThumbRef}
                                        type="range"
                                        className="data-viewer-distance-thumb data-viewer-distance-thumb-from"
                                        min={sliderMin}
                                        max={sliderMax}
                                        step="any"
                                        value={sliderFrom}
                                        aria-label="Distance from slider"
                                        onKeyDown={(event) => handleThumbKeyDown('from', event)}
                                        onChange={(event) => moveEdgeTo('from', Number(event.target.value))}
                                    />
                                    <input
                                        ref={toThumbRef}
                                        type="range"
                                        className="data-viewer-distance-thumb data-viewer-distance-thumb-to"
                                        min={sliderMin}
                                        max={sliderMax}
                                        step="any"
                                        value={sliderTo}
                                        aria-label="Distance to slider"
                                        onKeyDown={(event) => handleThumbKeyDown('to', event)}
                                        onChange={(event) => moveEdgeTo('to', Number(event.target.value))}
                                    />
                                </div>
                                <div className="data-viewer-distance-ticks">
                                    {/* The upper bound is drawn at the right edge, so ticks that would
                                        land on it are cut above rather than printed over it. */}
                                    {drawnTicks.map((value) => {
                                        const percent = ((value - sliderMin) / sliderSpan) * 100;
                                        return (
                                            <span
                                                key={value}
                                                className={`data-viewer-distance-tick${percent < 2 ? ' data-viewer-distance-tick-min' : ''}`}
                                                style={{ left: `${percent}%` }}
                                            >
                                                <span className="data-viewer-distance-tick-mark" />
                                                <span className="data-viewer-distance-tick-label">{tickLabel(value)}</span>
                                            </span>
                                        );
                                    })}
                                    <span className="data-viewer-distance-tick data-viewer-distance-tick-max" style={{ left: '100%' }} title={exactMaxLabel}>
                                        <span className="data-viewer-distance-tick-mark" />
                                        <span className="data-viewer-distance-tick-label">{maxTickLabel}</span>
                                    </span>
                                </div>
                            </>
                        ) : null}

                        <div className="data-viewer-distance-fields">
                            <label className="data-viewer-distance-field">
                                <span className="data-viewer-distance-field-label">From</span>
                                <input value={from} onChange={(event) => setFrom(event.target.value)} inputMode="decimal" aria-label="Distance from" autoFocus />
                            </label>
                            <label className="data-viewer-distance-field">
                                <span className="data-viewer-distance-field-label">To</span>
                                <input value={to} onChange={(event) => setTo(event.target.value)} inputMode="decimal" aria-label="Distance to" />
                            </label>
                        </div>

                        {/* Quick windows. Every one of them is a fraction of the *extent*, so they
                            exist only when the extent does — the same condition that draws the
                            slider. Without bounds there is nothing for "First 25%" to be a quarter
                            of, and a row of buttons that silently did nothing would be worse than a
                            row that is not there. */}
                        {hasExtent ? (
                            <div className="data-viewer-distance-quick">
                                <span className="data-viewer-distance-quick-label">Quick windows</span>
                                {DISTANCE_QUICK_WINDOWS.map((row, index) => (
                                    <div key={index} className="data-viewer-distance-quick-row">
                                        {row.map((item) => (
                                            <button
                                                key={item.label}
                                                type="button"
                                                className="btn btn-secondary data-viewer-distance-quick-button"
                                                onClick={() => applyQuickWindow(item.edge, item.ratio)}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        {notice ? <div className="error-box data-viewer-distance-notice">{notice}</div> : null}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-primary" onClick={apply}>
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
// ─── end distance-base seam (editor) ──────────────────────────────────────────────────────────

function FormatTimezoneModal({
    timeFormat,
    timeZone,
    onApply,
    onClose,
}: {
    timeFormat: string;
    timeZone: string;
    onApply: (next: { timeFormat: string; timeZone: string }) => void;
    onClose: () => void;
}) {
    return (
        <NeoTimeZoneModal
            isOpen={true}
            formatInitValue={timeFormat}
            zoneInitValue={timeZone}
            onClose={(next) => {
                if (next.timeFormat === timeFormat && next.timeZone === timeZone) onClose();
                else onApply(next);
            }}
        />
    );
}


interface DataViewerPageProps {
    pCode?: {
        dbName?: string;
        userName?: string;
        tableName?: string;
        tableType?: string;
        databaseId?: number | string;
        jobName?: string;
        collectorId?: string;
        tagColumn?: string;
        timeColumn?: string;
        valueColumn?: string;
        metaTagColumn?: string;
    };
    embedded?: boolean;
}

export default function DataViewerPage({ pCode, embedded = false }: DataViewerPageProps) {
    const [params] = useSearchParams();
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<string>(gSelectedTab);
    const dbName = pCode?.dbName ?? getParam(params, 'db');
    const userName = pCode?.userName ?? getParam(params, 'user');
    const tableName = pCode?.tableName ?? getParam(params, 'table');
    const databaseId = pCode?.databaseId ?? getParam(params, 'databaseId');
    const tagColumn = pCode?.tagColumn || 'NAME';
    const timeColumn = pCode?.timeColumn || 'TIME';
    const valueColumn = pCode?.valueColumn || 'VALUE';
    const metaTagColumn = pCode?.metaTagColumn || tagColumn;
    const headerLabels = buildDataViewerHeaderLabels(pCode?.jobName ?? pCode?.collectorId, tableName);
    // One Data Viewer board is reused for every table opened from the DB Explorer, so all of the
    // above can change under a live mount. These two keys are what every table-scoped read is
    // matched against; each names exactly the inputs its own read is built from, so a read is stale
    // the moment any of them moves.
    const tableKey = buildDataViewerReadKey(dbName, userName, tableName);
    const tagReadKey = buildDataViewerReadKey(dbName, userName, tableName, metaTagColumn);

    const [tags, setTags] = useState<DataViewerTag[]>([]);
    // Which table the tag list, the asset tree and `selectedTagNames` describe — written in the same
    // commit as all three, and compared against `tagReadKey` during render. The tags are the other
    // half of a query, and they are stale for exactly as long as the schema is: without this the
    // page reaches the point where a query is allowed out while `selectedTagNames` still holds the
    // previous table's tags, and asks the new table for a tag it has never heard of.
    const [loadedTagsKey, setLoadedTagsKey] = useState<string | null>(null);
    // Column metadata for the viewed table, read once per table, carried with the key of the table
    // it was read for. Two decisions below consume it — the base axis and the JSON-value refusal —
    // but it is deliberately not fed back into the query columns (see `baseColumn`).
    const [baseColumnsRead, setBaseColumnsRead] = useState<{ key: string; columns: DataViewerColumnRow[] } | null>(null);
    // `null` means "not read yet, or read for a table that is no longer the one on screen", which is
    // a different answer from `[]` ("read, and there is nothing there"): the JSON check has to be
    // able to tell an unresolved schema from an unreadable one, or the page fires a query it is
    // about to refuse. Derived rather than reset from an effect — see `buildDataViewerReadKey`.
    const baseColumns = baseColumnsRead && baseColumnsRead.key === tableKey ? baseColumnsRead.columns : null;
    const [assetHierarchy, setAssetHierarchy] = useState<DataViewerAssetHierarchy | undefined>();
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagFilter, setTagFilter] = useState('');
    const [activeTagTab, setActiveTagTab] = useState<'tags' | 'asset'>('tags');
    const [collapsedAssetFolders, setCollapsedAssetFolders] = useState<Set<string>>(() => new Set());
    // A JSON row is the entry point to its own keys: the document it holds already describes them,
    // so opening one is all the discovery this page needs. `picker` holds the row that was clicked,
    // `detail` the keys chosen from it.
    const [jsonKeyPicker, setJsonKeyPicker] = useState<{ tagName: string; baseLabel: string; columnName: string; document: unknown; selected: string[] } | null>(null);
    // The cell whose text does not fit a row. Held by row index for the same reason `rowDetailIndex`
    // is: the value itself would freeze while the grid under it moved on.
    const [textCell, setTextCell] = useState<{ index: number; key: string; label: string } | null>(null);
    // Index into the page's rows rather than a copy of one: the detail view moves between rows with
    // the arrow keys, and holding the row itself would freeze it on whichever one was opened.
    const [rowDetailIndex, setRowDetailIndex] = useState<number | null>(null);
    const [jsonKeyDetail, setJsonKeyDetail] = useState<{ tagName: string; columnName: string; paths: string[] } | null>(null);
    // The picker's filter and folds, held across the trip into the detail view and back. A ref, not
    // state: nothing on this page renders from it, and putting it in state would re-render the whole
    // Data Viewer on every keystroke typed into a modal filter box. Cleared with the picker itself.
    const jsonKeyPickerViewRef = useRef<JsonKeyPickerView | undefined>(undefined);
    const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
    const [mode, setMode] = useState<'raw' | 'chart'>('raw');
    // Which numeric column the chart draws, or `null` for "still on this table's default". Held as
    // an override for the same reason the range is: the default cannot be known until the schema
    // read lands, and seeding state with a guess would let one chart of the wrong column out first.
    const [chartValueKeyOverride, setChartValueKeyOverride] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    // What the user set, or `null` for "still on the default". Kept as an override rather than as
    // the range itself because the right default depends on the base axis, and the axis is not known
    // until the schema read lands. Seeding the state with a time default and correcting it in an
    // effect would let one `last-1h` window escape to the server against a distance table first; a
    // render-time fallback (see `range` below) cannot, because the corrected value is already in
    // place on the very render that first learns the axis.
    const [rangeOverride, setRangeOverride] = useState<DataViewerTimeRange | null>(null);
    const [frozenWindow, setFrozenWindow] = useState<FrozenWindow | null>(null);
    // Bumped by the Refresh button. It is part of the window key, so bumping it is what makes an
    // otherwise unchanged `last`/`now` expression resolve against the clock a second time.
    const [refreshToken, setRefreshToken] = useState(0);
    // The window resolver can issue its own boundary query, and until it answers there is no window
    // to read with. Without this the grid would blink through "No data" on every re-resolution.
    const [rangeResolving, setRangeResolving] = useState(false);
    const [rangeEditor, setRangeEditor] = useState<{ type: 'global' } | { type: 'split'; groupId: string } | null>(null);
    // The distance editor's slider extent. `null` is "not known" — the editor then hides the slider
    // and keeps free numeric entry, so this never gates the dialog opening.
    const [distanceBounds, setDistanceBounds] = useState<{ min: number; max: number } | null>(null);
    const [splitChartGroups, setSplitChartGroups] = useState<Array<{ id: string; title: string; tagNames: string[] }>>([]);
    const [splitChartRanges, setSplitChartRanges] = useState<Record<string, DataViewerTimeRange>>({});
    const [resolvedSplitChartRanges, setResolvedSplitChartRanges] = useState<Record<string, DataViewerTimeRange>>({});
    const [chartViewRanges, setChartViewRanges] = useState<Record<string, DataViewerTimeRange>>({});
    const [chartNavigatorRanges, setChartNavigatorRanges] = useState<Record<string, DataViewerTimeRange>>({});
    const [openChartMenuId, setOpenChartMenuId] = useState<string | null>(null);
    const [chartResults, setChartResults] = useState<Record<string, { range: DataViewerTimeRange; series: Array<{ name: string; data: Array<[number, number | null]> }> }>>({});
    const [splitChartRows, setSplitChartRows] = useState<Record<string, ResultRow[]>>({});
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState('');
    const [backwardScan, setBackwardScan] = useState(true);
    const [timeFormat, setTimeFormat] = useState(DEFAULT_TIME_FORMAT);
    const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
    const [formatOpen, setFormatOpen] = useState(false);
    const [rows, setRows] = useState<ResultRow[]>([]);
    // Which frozen window `rows` were read for, in the same key space as `frozenWindowKey`. `null`
    // is "these rows belong to no window" — the state `rows` is left in whenever it is blanked.
    //
    // The chart is rebuilt from `rows`, and `rows` and the window do not move together: a tag change
    // invalidates the window during render, `fetchRows` then blanks the rows, and the resolver hands
    // back the new window a tick before the new rows arrive. For that tick `rows` is `[]` under a
    // perfectly valid window, and a chart rebuilt there has no series at all — the panel empties and
    // refills, which is what reads as the flicker. Carrying the key alongside the rows is what makes
    // "are these the rows for the window on screen?" answerable, and `chartRowsPending` below is the
    // one place that question is asked. Always written in the same commit as `setRows`, so the pair
    // can never be observed half-updated.
    const [rowsWindowKey, setRowsWindowKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [endLoading, setEndLoading] = useState(false);
    const [error, setError] = useState('');
    const [rawRowsPerTag, setRawRowsPerTag] = useState(DEFAULT_DATA_VIEWER_ROWS_PER_TAG);
    const [rawPageBounds, setRawPageBounds] = useState<ReturnType<typeof buildDataViewerRawPageBounds>>(null);
    const [rawPageRequest, setRawPageRequest] = useState<RawPageRequest>({ page: 1 });
    // `customScrollParent` takes an HTMLElement, not a ref object, and a `useRef.current` read is
    // still null on the first render — state + callback ref forces the re-render that hands the
    // resolved node to TableVirtuoso.
    const [rawScrollEl, setRawScrollEl] = useState<HTMLDivElement | null>(null);
    // Column widths are derived from a per-character advance width. Hardcoding it is fragile:
    // `--font-family-mono` is `D2Coding, monospace`, but the @font-face in src/index.css uses
    // `format(woff)` unquoted, which is invalid per CSS Fonts 3 — so the cells may render in the
    // UA monospace instead. Measure whatever font actually resolves, and re-measure once webfonts
    // finish loading. `buildRawColumnWidths` falls back to its constant when this stays undefined.
    const [rawCharWidth, setRawCharWidth] = useState<number | undefined>(undefined);
    const rowsRequestRef = useRef(0);
    const chartRequestRef = useRef(0);
    const endPageRequestRef = useRef(0);
    const splitRangeRequestRef = useRef(0);
    const selectedTagKey = selectedTagNames.join('\n');
    const rawPageSize = useMemo(() => getDataViewerRawPageSize(selectedTagNames, rawRowsPerTag), [rawRowsPerTag, selectedTagNames]);

    const visibleTags = useMemo(() => {
        return filterDataViewerTags(tags, tagFilter);
    }, [tagFilter, tags]);

    const allAssetRows = useMemo(() => {
        if (!assetHierarchy) return [];
        return buildAssetTreeRows(tags, assetHierarchy, '');
    }, [assetHierarchy, tags]);

    const assetRows = useMemo(() => {
        if (!assetHierarchy) return [];
        return filterVisibleAssetRows(buildAssetTreeRows(tags, assetHierarchy, tagFilter), collapsedAssetFolders);
    }, [assetHierarchy, collapsedAssetFolders, tagFilter, tags]);
    const selectableRows = useMemo(
        () => [
            ...tags.map((tag) => ({ type: 'tag' as const, id: `tag:${tag.name}`, label: tag.name, depth: 0, name: tag.name, dataType: tag.dataType, parentIds: [] })),
            ...allAssetRows.filter((row) => row.type === 'tag'),
        ],
        [allAssetRows, tags],
    );
    // Everything the user has to supply before a read is even meaningful. Kept separate from
    // `canQuery` because the two answer different questions: this one drives the "you still have to
    // pick something" empty state, `canQuery` drives whether SQL goes out.
    const queryInputsReady = Boolean(dbName && userName && tableName && selectedTagNames.length > 0);
    // The schema read has not answered *for the table on screen* yet. Not a refusal — a not-yet.
    // Every query waits it out, so a JSON table never gets a single read off the ground, and the
    // grid stays in its normal loading state rather than flashing a refusal it might have to take
    // back. On a table switch this is true from the very first render that carries the new table,
    // because it is decided by key rather than by an effect that has not run yet.
    const baseColumnsPending = baseColumns === null;
    // The tag list on hand was read for some other table (or has not been read at all). Same shape,
    // same reason: `tags`, `assetHierarchy` and `selectedTagNames` are all written together with
    // `loadedTagsKey`, so while this is true every one of them belongs to the previous table.
    const tagsPending = loadedTagsKey !== tagReadKey;
    // Neither read describes the table on screen yet. This is the whole table-switch guard: the two
    // asynchronous facts a query is built from — what the base column is, and which tags exist —
    // both lag the props by at least a round trip, and a query fired inside that lag mixes the new
    // table's name and base column with the old table's tags and axis.
    const tableReadsPending = baseColumnsPending || tagsPending;
    // `baseColumns` is `[]` when the metadata read failed or returned nothing, and an unreadable
    // schema is explicitly not a JSON one — see `isDataViewerJsonValueColumn`. Deliberately NOT part
    // of `canQuery`: a JSON value column is a perfectly readable table, and Raw shows the document
    // as text. It gates the two consumers that need a numeric value — Chart and Tag Analyzer.
    const valueColumnIsJson = isDataViewerJsonValueColumn(baseColumns ?? [], valueColumn);
    // The single gate every query path in this component already reads. Only the two table reads are
    // folded in, and only because what a query *is* depends on them — reads themselves are never
    // refused on the strength of what the schema turns out to say.
    const canQuery = queryInputsReady && !tableReadsPending;
    // The table's base axis. `timeColumn` is the fallback, not an override: both entry points
    // (DBExplorer's TableInfo and tablePage) already resolve it from the table's BASETIME flag via
    // `buildDataViewerColumnConfigFromColumnRows`, so it is the best answer available when this
    // metadata read comes back empty.
    //
    // Computed here, above everything that reads a range, because the default range is derived from
    // it. While `baseColumns` is still `null` this answers 'time', but `canQuery` is false for
    // exactly that span, so the provisional answer never reaches a query.
    const baseColumn = resolveDataViewerBaseColumn(baseColumns ?? [], timeColumn);
    const baseKind = resolveDataViewerBaseKind(baseColumns ?? [], baseColumn);
    // Only the Tag Analyzer handoff reads this: that payload states the axis as a type code rather
    // than as a kind, and the two must not be derived independently.
    const baseColumnType = resolveDataViewerBaseColumnType(baseColumns ?? [], baseColumn);
    const baseAxisLabel = getDataViewerBaseAxisLabel(baseKind);
    /**
     * Every column of the viewed table, tied to the row key its value will arrive under.
     *
     * No extra read: `baseColumns` is the M$SYS_COLUMNS result the page already holds, and this is
     * the first thing that walks it rather than picking one column out of it. `[]` here means the
     * schema is unreadable or does not account for the query's three fixed positions, which is what
     * sends the grid back to naming its columns from the rows.
     */
    const columnSpecs = useMemo<DataViewerColumnSpec[]>(
        () => buildDataViewerColumnSpecs(baseColumns ?? [], { baseColumn, tagColumn, valueColumn, baseKind }),
        [baseColumn, baseColumns, baseKind, tagColumn, valueColumn],
    );
    /** Spec by row key, for the readers that hold a key and need the column behind it. */
    const columnSpecByKey = useMemo(() => new Map(columnSpecs.map((spec) => [spec.key, spec])), [columnSpecs]);
    /** What the raw query has to name beyond `time`/`name`/`value` — binary excluded, see the model. */
    const rawExtraColumns = useMemo(() => buildDataViewerExtraProjection(columnSpecs), [columnSpecs]);
    /**
     * The columns a chart could draw: every numeric one that is not the base axis.
     *
     * The value column is first when it qualifies, because the specs are in display order — so a
     * table shaped the way every table used to be shaped charts exactly what it charted before,
     * without the default being written down a second time.
     */
    const chartValueColumns = useMemo(() => columnSpecs.filter((spec) => spec.role !== 'base' && spec.kind === 'number'), [columnSpecs]);
    /** The chosen column, or the first chartable one. An override for a column this table does not have is ignored, not honoured. */
    const chartValueSpec = useMemo(
        () => chartValueColumns.find((spec) => spec.key === chartValueKeyOverride) ?? chartValueColumns[0],
        [chartValueColumns, chartValueKeyOverride],
    );
    /** Row key the chart plots. `value` while the schema is unknown, which is the alias it has always read. */
    const chartValueKey = chartValueSpec?.key ?? 'value';
    /**
     * Whether this table has anything to chart.
     *
     * This replaces "the value column is JSON", which was the same question only while a row had
     * one value in it. A table carrying a JSON payload *and* a DOUBLE reading is chartable, and used
     * to be refused. With no schema to go on the old answer still stands: the value column is
     * chartable unless the read positively showed it to be JSON.
     */
    const canChart = columnSpecs.length > 0 ? chartValueColumns.length > 0 : !valueColumnIsJson;
    /** A chart of an extra column has to ask for it; the split-panel reads project nothing else. */
    const chartExtraColumns = useMemo(
        () => (chartValueSpec && chartValueSpec.role === 'extra' ? [{ name: chartValueSpec.name, key: chartValueSpec.key }] : []),
        [chartValueSpec],
    );
    // `getDataViewerDefaultRange` returns a module constant, so an untouched range keeps one stable
    // identity across renders — every memo and effect keyed on `range` stays quiet.
    const range = rangeOverride ?? getDataViewerDefaultRange(baseKind);
    // Staleness is decided during render, not in the resolver's `.then`. If it were decided
    // asynchronously, the render that changes the tag selection would still see the previous window
    // and fire one query against it before the fresh window landed.
    const frozenWindowKey = buildFrozenWindowKey(range, selectedTagKey, refreshToken);
    const activeWindow = frozenWindow && frozenWindow.key === frozenWindowKey ? frozenWindow : null;
    const resolvedRange = useMemo<DataViewerTimeRange>(() => ({ from: activeWindow?.from ?? '', to: activeWindow?.to ?? '' }), [activeWindow]);
    const chartGroups = useMemo(
        () =>
            buildDataViewerChartGroups({
                selectedTagNames,
                splitGroups: splitChartGroups,
                globalRange: resolvedRange,
                splitRanges: resolvedSplitChartRanges,
            }),
        [resolvedRange, resolvedSplitChartRanges, selectedTagNames, splitChartGroups],
    );
    const splitAssignedNames = useMemo(() => new Set(splitChartGroups.flatMap((group) => group.tagNames || [])), [splitChartGroups]);

    // The axis is only known once the schema read lands, so the format button is on screen — and can
    // be clicked — while the table is still provisionally a time base. A modal that outlives the
    // button that opened it has no way back to the toolbar, so a distance answer closes it.
    useEffect(() => {
        if (baseKind === 'distance') setFormatOpen(false);
    }, [baseKind]);

    useEffect(() => {
        if (!openChartMenuId) return undefined;

        const handlePointerDown = (event: PointerEvent) => {
            if (event.target instanceof Element && event.target.closest('.data-viewer-chart-action-menu')) return;
            setOpenChartMenuId(null);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenChartMenuId(null);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openChartMenuId]);

    const toggleAssetFolder = useCallback((folderId: string) => {
        setCollapsedAssetFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    }, []);

    useEffect(() => {
        const next = normalizeSelectedTagNames(selectedTagNames, selectableRows);
        if (next.join('\n') !== selectedTagKey) {
            rowsRequestRef.current += 1;
            chartRequestRef.current += 1;
            endPageRequestRef.current += 1;
            setSelectedTagNames(next);
            // No `currentBounds`: carrying the previous page's row bounds here would pin the query
            // to a span the new selection may have no data in, overriding the window that is about
            // to be re-resolved for it. The frozen window is the only source of the time bounds.
            setRawPageRequest(
                buildDataViewerRawPageRequest({
                    currentPage: page,
                    nextPage: page,
                    pageSize: getDataViewerRawPageSize(next, rawRowsPerTag),
                    reason: 'tags',
                }),
            );
        }
    }, [page, rawPageBounds, rawRowsPerTag, selectableRows, selectedTagKey, selectedTagNames]);

    useEffect(() => {
        const selected = new Set(selectedTagNames);
        setSplitChartGroups((current) => {
            const next = current
                .map((group) => ({
                    ...group,
                    tagNames: (group.tagNames || []).filter((name) => selected.has(name)),
                }))
                .filter((group) => group.tagNames.length > 0);
            const same =
                next.length === current.length &&
                next.every((group, index) => group.id === current[index].id && group.tagNames.join('\n') === (current[index].tagNames || []).join('\n'));
            return same ? current : next;
        });
    }, [selectedTagNames]);

    useEffect(() => {
        const validGroupIds = new Set(chartGroups.map((group) => group.id));
        setChartViewRanges((current) => {
            const next: Record<string, DataViewerTimeRange> = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
        setChartNavigatorRanges((current) => {
            const next: Record<string, DataViewerTimeRange> = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
        setSplitChartRanges((current) => {
            const next: Record<string, DataViewerTimeRange> = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
        setResolvedSplitChartRanges((current) => {
            const next: Record<string, DataViewerTimeRange> = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
        setChartResults((current) => {
            const next: typeof current = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
        setSplitChartRows((current) => {
            const next: Record<string, ResultRow[]> = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
    }, [chartGroups]);

    /**
     * Where each panel is looking belongs to the table it was looking at.
     *
     * The pruning above cannot do this. It keeps every entry whose chart group is still live, and
     * the main panel's group id is the constant `'default'` — live in every table, so its window is
     * the one thing that never expires. Dragging or wheeling inside the chart writes exactly that
     * entry and nothing else, which is why a table opened after a drag drew its panel on the
     * previous table's coordinates: an axis reading 998.001K ~ 998.3K over a window of 0 ~ 1000,
     * with the range button and the navigator both correctly showing the new table. Refresh could
     * not clear it because a refresh re-queries rather than moves the panel, and nudging the
     * navigator did, because that writes these entries afresh.
     *
     * A split panel's window is included for the same reason and not only for symmetry: split
     * groups survive a table change whenever their tag names do, and two tables sharing a tag name
     * is ordinary.
     *
     * Reset from an effect rather than derived through the table key — the way `baseColumns` above
     * is — because these describe a view and not a query. Nothing is read from the database on the
     * strength of them, so the one commit they lag by cannot put a query on the wire; that risk is
     * what makes the schema read state it differently.
     */
    useEffect(() => {
        const clearRanges = (current: Record<string, DataViewerTimeRange>) => (Object.keys(current).length === 0 ? current : {});
        setChartViewRanges(clearRanges);
        setChartNavigatorRanges(clearRanges);
        setSplitChartRanges(clearRanges);
        setResolvedSplitChartRanges(clearRanges);
    }, [tableKey]);

    const moveRawPage = useCallback(
        (nextPage: number) => {
            const request = buildDataViewerRawPageRequest({
                currentPage: page,
                nextPage,
                pageSize: rawPageSize,
                currentBounds: rawPageBounds,
                reason: 'page',
            });
            rowsRequestRef.current += 1;
            setRawPageRequest(request);
            setPage(request.page);
        },
        [page, rawPageBounds, rawPageSize],
    );

    const handleRowsPerTagChange = useCallback(
        (value: string) => {
            const update = buildDataViewerRawRowsPerTagChange({
                value,
                currentRowsPerTag: rawRowsPerTag,
                selectedTagNames,
            });
            if (!update) return rawRowsPerTag;

            rowsRequestRef.current += 1;
            chartRequestRef.current += 1;
            endPageRequestRef.current += 1;
            setRawRowsPerTag(update.rowsPerTag);
            setRawPageBounds(null);
            setRawPageRequest(update.rawPageRequest);
            setPage(update.page);
            return update.rowsPerTag;
        },
        [rawRowsPerTag, selectedTagNames],
    );

    const handleTagSelectionChange = useCallback(
        (tagName: string) => {
            rowsRequestRef.current += 1;
            chartRequestRef.current += 1;
            endPageRequestRef.current += 1;
            // `currentBounds` is deliberately omitted — see the normalize effect above. Changing the
            // selection changes the window key, so a fresh window is already on its way; the old
            // page's bounds must not be allowed to outrank it.
            const update = buildDataViewerTagSelectionUpdate({
                selectedTagNames,
                tagName,
                currentPage: page,
            });
            setSelectedTagNames(update.selectedTagNames);
            setRawPageRequest(update.rawPageRequest);
        },
        [page, selectedTagNames],
    );

    const handleCreateSplitChart = useCallback(
        (tagNames: string[]) => {
            const nextGroups = buildDataViewerSplitGroups({
                tagNames,
                selectedTagNames,
                assignedTagNames: Array.from(splitAssignedNames),
            });
            if (nextGroups.length === 0) return;
            const rangeUpdate = buildDataViewerSplitRangeUpdate({
                nextGroups,
                chartViewRanges,
                chartNavigatorRanges,
                splitRanges: splitChartRanges,
            });
            chartRequestRef.current += 1;
            setChartViewRanges(rangeUpdate.chartViewRanges);
            setChartNavigatorRanges(rangeUpdate.chartNavigatorRanges);
            setSplitChartRanges(rangeUpdate.splitRanges);
            setSplitChartGroups((current) => [...current, ...nextGroups]);
        },
        [chartNavigatorRanges, chartViewRanges, selectedTagNames, splitAssignedNames, splitChartRanges],
    );

    const handleRemoveSplitChart = useCallback((groupId: string) => {
        chartRequestRef.current += 1;
        splitRangeRequestRef.current += 1;
        setSplitChartGroups((current) => current.filter((group) => group.id !== groupId));
        setSplitChartRanges((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
            return next;
        });
        setResolvedSplitChartRanges((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
            return next;
        });
        setChartViewRanges((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
            return next;
        });
        setChartNavigatorRanges((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
            return next;
        });
        setChartResults((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
            return next;
        });
        setSplitChartRows((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
            return next;
        });
    }, []);

    const handleToggleSplitChart = useCallback(
        (tagName: string) => {
            const splitGroup = splitChartGroups.find((group) => (group.tagNames || []).includes(tagName));
            if (splitGroup) {
                handleRemoveSplitChart(splitGroup.id);
                return;
            }
            handleCreateSplitChart([tagName]);
        },
        [handleCreateSplitChart, handleRemoveSplitChart, splitChartGroups],
    );

    useEffect(() => {
        if (!dbName || !userName || !tableName) return;
        // The key this read is aimed at, captured before it goes out. Stamping the result with it —
        // in the same commit as the tags and the selection derived from it — is what lets the render
        // above tell "these tags are this table's" from "these tags are the previous table's", with
        // no window in between where the answer is neither.
        const readKey = buildDataViewerReadKey(dbName, userName, tableName, metaTagColumn);
        let alive = true;
        setTagsLoading(true);
        setError('');
        listTableTags({ dbName, userName, tableName, tagColumn: metaTagColumn })
            .then((result) => {
                if (!alive) return;
                setTags(result.tags);
                setAssetHierarchy(result.assetHierarchy);
                setActiveTagTab('tags');
                setCollapsedAssetFolders((prev) => (prev.size === 0 ? prev : new Set()));
                setSelectedTagNames(result.tags[0]?.name ? [result.tags[0].name] : []);
                setLoadedTagsKey(readKey);
                setRawPageBounds(null);
                setRawPageRequest(toFirstPageRequest);
                setPage(1);
            })
            .catch((err) => {
                if (!alive) return;
                // `loadedTagsKey` deliberately stays where it was: a table whose tags could not be
                // listed has no tags to query for, and leaving the key behind is what keeps the
                // previous table's selection from being aimed at this one.
                setError(err?.message || 'Failed to load tags');
            })
            .finally(() => {
                if (alive) setTagsLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [dbName, metaTagColumn, tableName, userName]);

    // Keyed on the same table identity as the tag list above, but kept as its own effect: this read
    // is advisory. `listTableColumns` resolves to `[]` rather than rejecting, and nothing here
    // touches `error` or `tagsLoading`, so a table whose metadata is unreadable still lists its tags
    // and renders its grid — it just falls back to assuming a time base and to querying.
    //
    // It depends only on the table identity, never on `canQuery`. That direction is load-bearing:
    // `canQuery` is derived from what this read returns, so a dependency the other way would be a
    // cycle — the read would wait on a gate that is waiting on the read.
    useEffect(() => {
        // Nothing is blanked here. "Is this schema the one on screen?" is answered during render by
        // comparing keys (see `baseColumnsPending`), and it has to be: an effect resetting the state
        // runs a commit *after* the render that first carries the new table, and a query fired from
        // that commit judges the new table by the previous one's axis.
        const readKey = buildDataViewerReadKey(dbName, userName, tableName);
        // Back to "no range set", so the new table picks up its own axis's default rather than
        // inheriting a distance span onto a time table (or the reverse). This one is safe as an
        // effect: no query can go out until a read lands for the new key, which takes at least a
        // round trip, and this update is already queued before that.
        setRangeOverride(null);
        if (!dbName || !userName || !tableName) {
            setBaseColumnsRead({ key: readKey, columns: [] });
            return undefined;
        }
        let alive = true;
        listTableColumns({ dbName, userName, tableName })
            .then((columns) => {
                if (alive) setBaseColumnsRead({ key: readKey, columns: Array.isArray(columns) ? columns : [] });
            })
            .catch(() => {
                if (alive) setBaseColumnsRead({ key: readKey, columns: [] });
            });
        return () => {
            alive = false;
        };
    }, [dbName, tableName, userName]);

    const resolveRangeForTagNames = useCallback(async (targetRange: DataViewerTimeRange, tagNames: string[]) => {
        // A distance axis has no clock, so no *time* boundary query is issued — `queryTagBoundaryTime`
        // would come back with the stat view's reinterpreted bit pattern or a scan of a column that
        // measures metres — and no date parsing happens, so `toDataViewerDate` never gets the chance
        // to turn 999990 into 1970-01-01. The edges are the numbers themselves; `null` means the
        // value was not one.
        //
        // It does have an *extent*, though, and that is what `first`/`last` are anchored to. Those
        // edges are resolved here, against the same base-column bounds the slider is drawn from, and
        // only when one is actually present — a pair of coordinates costs no round trip.
        if (baseKind === 'distance') {
            const needsExtent = isDistanceAnchorEdge(targetRange.from) || isDistanceAnchorEdge(targetRange.to);
            const extent = needsExtent
                ? await queryTagBaseColumnBounds({ dbName, userName, tableName, names: tagNames, tagColumn, baseColumn, baseKind }).catch(() => null)
                : null;
            const fromValue = resolveDistanceEdge(targetRange.from, extent);
            const toValue = resolveDistanceEdge(targetRange.to, extent);
            return {
                from: fromValue === null ? null : formatDataViewerDistance(fromValue),
                to: toValue === null ? null : formatDataViewerDistance(toValue),
                // The same signal the time path raises when `last` cannot be resolved: an anchored
                // edge with no extent behind it is a window nobody can query.
                missingBoundary: needsExtent && !extent,
            };
        }

        const nowDate = new Date();
        let lastBaseDate: Date | null | undefined;
        const resolveQueryRange = async (value: unknown, boundary: 'from' | 'to') => {
            const text = String(value ?? '').trim();
            if (!text.startsWith('last')) return resolveTimeRangeInput(value, nowDate, boundary);

            if (lastBaseDate === undefined) {
                const latestTime = await queryTagBoundaryTime({
                    dbName,
                    userName,
                    tableName,
                    names: tagNames,
                    direction: 'latest',
                    tagColumn,
                    timeColumn,
                });
                lastBaseDate = toDataViewerDate(latestTime);
            }

            if (!lastBaseDate) return null;
            return resolveTimeRangeInput(value, lastBaseDate, boundary);
        };

        const from = await resolveQueryRange(targetRange.from, 'from');
        const to = await resolveQueryRange(targetRange.to, 'to');
        // `null` from a `last` token means the tag simply has no samples to anchor to — a data
        // availability fact, not bad input. Reported separately so the UI can say which it was.
        return { from, to, missingBoundary: lastBaseDate === null };
    }, [baseKind, dbName, tableName, tagColumn, timeColumn, userName]);

    // The one place `last`/`now` is turned into a literal timestamp pair. It runs on mount, on a tag
    // selection change (the `last` base is the *selected* tags' newest sample, so it moves with them),
    // on Apply, and on Refresh — never on a page move, which is the whole point of freezing.
    useEffect(() => {
        if (!canQuery) {
            setFrozenWindow(null);
            setRangeResolving(false);
            return undefined;
        }

        const windowKey = frozenWindowKey;
        let alive = true;
        setRangeResolving(true);
        resolveRangeForTagNames(range, selectedTagNames)
            .then(({ from, to, missingBoundary }) => {
                if (!alive) return;
                setRangeResolving(false);
                const distance = baseKind === 'distance';
                if (from === null || to === null) {
                    setFrozenWindow(null);
                    // A `last` token with nothing to anchor to is a property of the data, not of
                    // what the user typed — saying "check the entered time" sends them to fix a
                    // range that is perfectly valid. On a distance axis there is no boundary to be
                    // missing, so `null` can only mean the edge was not a number.
                    setError(distance ? DISTANCE_RANGE_INVALID_MESSAGE : missingBoundary ? TAG_HAS_NO_DATA_MESSAGE : TIME_RANGE_INVALID_MESSAGE);
                    return;
                }
                if (!from || !to) {
                    setFrozenWindow(null);
                    setError(distance ? DISTANCE_RANGE_REQUIRED_MESSAGE : TIME_RANGE_REQUIRED_MESSAGE);
                    return;
                }
                // Numeric on distance, chronological on time. `new Date('0')` is the year 2000 and
                // `new Date('1000')` is the year 1000, so the date comparison would call the default
                // 0 ~ 1000 window reversed and refuse to open the table at all.
                if (isDataViewerRangeReversed(from, to, baseKind)) {
                    setFrozenWindow(null);
                    setError(distance ? DISTANCE_RANGE_ORDER_MESSAGE : TIME_RANGE_ORDER_MESSAGE);
                    return;
                }
                setFrozenWindow({ from, to, key: windowKey });
            })
            .catch((err: any) => {
                if (!alive) return;
                setRangeResolving(false);
                setFrozenWindow(null);
                setError(err?.message || 'Failed to resolve the time range');
            });

        return () => {
            alive = false;
        };
        // `frozenWindowKey` is the real trigger — `range` and `selectedTagNames` are listed because
        // the effect reads them, but they are state objects whose identity only changes alongside
        // the key, so they add no extra runs.
    }, [baseKind, canQuery, frozenWindowKey, selectedTagNames, range, resolveRangeForTagNames]);

    // The distance editor's slider bounds, read when the editor opens rather than with the table:
    // it is the only thing that wants them, and a dialog nobody opens should not have cost a query.
    // Cheap enough to re-read per open — the tag stat view answers the reference table in 197µs for
    // one tag and 1.46ms for ten — and re-reading is what keeps the extent honest after the tag
    // selection changes.
    //
    // Note which column this asks about: `baseColumn`, the BASETIME column the schema read resolved,
    // not `timeColumn`. On a distance table those differ. `baseKind` goes with it because it is what
    // opens the tag stat view's fast path — MIN_TIME/MAX_TIME hold that column's extent, but as raw
    // bytes labelled a time, and only a distance base has any business reinterpreting them. See
    // `queryTagBaseColumnBounds`.
    useEffect(() => {
        if (!rangeEditor || baseKind !== 'distance' || !canQuery) {
            setDistanceBounds(null);
            return undefined;
        }

        let alive = true;
        queryTagBaseColumnBounds({ dbName, userName, tableName, names: selectedTagNames, tagColumn, baseColumn, baseKind })
            .then((bounds) => {
                if (alive) setDistanceBounds(bounds);
            })
            .catch(() => {
                // Never surfaced: a missing extent is a missing slider, not an error the user has to
                // dismiss before they can type two numbers.
                if (alive) setDistanceBounds(null);
            });
        return () => {
            alive = false;
        };
    }, [baseColumn, baseKind, canQuery, dbName, selectedTagNames, rangeEditor, tableName, tagColumn, userName]);

    const fetchRows = useCallback(async () => {
        const requestId = rowsRequestRef.current + 1;
        rowsRequestRef.current = requestId;
        if (!canQuery) {
            setRows([]);
            setRowsWindowKey(null);
            setRawPageBounds(null);
            setLoading(false);
            return;
        }
        // No window yet — either the resolver is still in flight or it rejected the range and has
        // already put the reason in `error`. Either way nothing unbounded goes to the server, and
        // `error` is left alone so the resolver's message survives.
        const from = activeWindow?.from;
        const to = activeWindow?.to;
        if (!from || !to) {
            setRows([]);
            setRowsWindowKey(null);
            setRawPageBounds(null);
            setLoading(false);
            return;
        }
        // Read once, here, rather than off `activeWindow` in the `.then`: this is the window the
        // rows about to be requested belong to, and by the time they land the page may already be
        // resolving the next one.
        const windowKey = activeWindow.key;
        setLoading(true);
        setError('');
        try {
            const result = await queryTagData({
                dbName,
                userName,
                tableName,
                names: selectedTagNames,
                direction: backwardScan ? 'latest' : 'oldest',
                from: rawPageRequest.from ?? from,
                to: rawPageRequest.to ?? to,
                page: rawPageRequest.page || page,
                pageSize: rawPageSize,
                tagColumn,
                timeColumn,
                valueColumn,
                extraColumns: rawExtraColumns,
                baseKind,
                boundedRange: rawPageRequest.boundedRange,
                cursorSide: rawPageRequest.cursorSide,
                cursorTime: rawPageRequest.cursorTime,
                cursorName: rawPageRequest.cursorName,
                cursorOffset: rawPageRequest.cursorOffset,
            });
            if (rowsRequestRef.current !== requestId) return;
            // The bounds are the next page's cursor anchors, so they have to be read on the same
            // axis the query used — a distance value pushed through `new Date(...)` here would come
            // back as a 1970 timestamp and the next page move would match nothing.
            const nextBounds = buildDataViewerRawPageBounds(result.rows, baseKind);
            setRows(result.rows);
            setRowsWindowKey(windowKey);
            setRawPageBounds(nextBounds);
        } catch (err: any) {
            if (rowsRequestRef.current !== requestId) return;
            setRows([]);
            // A failed read is still an answer about *this* window: there are no rows for it. Marking
            // them as belonging to it is what lets the chart stop waiting and show its real empty
            // state, instead of holding the previous window's panels behind a spinner forever.
            setRowsWindowKey(windowKey);
            setRawPageBounds(null);
            setError(err?.message || 'Failed to load data');
        } finally {
            if (rowsRequestRef.current === requestId) setLoading(false);
        }
    }, [activeWindow, backwardScan, baseKind, canQuery, dbName, page, selectedTagNames, rawExtraColumns, rawPageRequest, rawPageSize, tableName, tagColumn, timeColumn, userName, valueColumn]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    // A new window means the previous page cursors point outside it, so paging always restarts at 1.
    // `refreshToken` is in here too: re-interpreting `last`/`now` produces a different window even
    // though the expression is unchanged.
    useEffect(() => {
        setRawPageBounds(null);
        setRawPageRequest(toFirstPageRequest);
        setPage(1);
        // `selectedTagKey` belongs here for the same reason as the others: it changes the window
        // key, so the page the user was on was numbered against a window that no longer exists.
    }, [range.from, range.to, backwardScan, refreshToken, selectedTagKey]);

    // Do the rows on hand describe the window currently on screen? Only when both exist and their
    // keys agree — a blanked `rows` carries `null`, and rows left over from the previous selection
    // carry that selection's key.
    const rowsMatchActiveWindow = activeWindow !== null && rowsWindowKey === activeWindow.key;
    // A range the resolver rejected produces no window and no query, so nothing is on the way. Left
    // out of `chartRowsPending`, the page would wait for rows that are never coming: the panels
    // would hold the last good picture behind a spinner that never clears, and the message telling
    // the user their range is invalid would sit under a chart still showing the old one.
    const windowResolutionFailed = activeWindow === null && !rangeResolving && Boolean(error);
    /**
     * The chart has no rows it may draw yet.
     *
     * This is the whole flicker fix. A tag toggle invalidates the window during render, `fetchRows`
     * blanks `rows`, and the resolver hands back the new window one commit *before* the new rows
     * land. Gating only on `activeWindow` leaves exactly that commit open: a valid window, an empty
     * `rows`, and a chart rebuilt from nothing — every series drops, `hasChartData` goes false and
     * the "No chart data" overlay paints for a frame before the rows refill it. Gating on the rows'
     * own window key closes it, because the key does not become current until the rows do.
     *
     * Two consumers, and they have to agree or the gap reopens: the rebuild effect below skips while
     * this is true (the panels keep the last picture they were drawn with), and the empty-state
     * overlay is suppressed while it is true (so a panel with no previous picture — a first load —
     * reads as loading rather than as empty).
     */
    const chartRowsPending = canQuery && !rowsMatchActiveWindow && !windowResolutionFailed;

    useEffect(() => {
        const requestId = chartRequestRef.current + 1;
        chartRequestRef.current = requestId;

        if (!canQuery || mode !== 'chart') {
            setChartResults({});
            setChartError('');
            setChartLoading(false);
            return undefined;
        }

        // Hold the previous panels until the rows for the window on screen have actually arrived (a
        // tag added or removed, a range applied, Refresh). Two things go wrong without this, and they
        // are separate. `chartGroups` already carries the blanked range while the window re-resolves,
        // so recomputing would size the axis from getPanelRange's fallback — a full hour on a time
        // axis — and the panel visibly stretches, then snaps back when the real window lands. And
        // once the window *has* landed but the rows have not, recomputing draws a panel with no
        // series at all. Holding covers both: one axis transition, and never an empty frame.
        if (chartRowsPending) {
            // The stack's own overlay, so a transition that is genuinely waiting on the server says
            // so. It lies over the held panels rather than replacing them, which is what keeps the
            // ECharts instances alive across the wait.
            setChartLoading(true);
            return undefined;
        }

        setChartLoading(true);
        setChartError('');
        const nextResults = buildDataViewerChartResultsFromRawRows({
            rows,
            rowsByGroup: splitChartRows,
            chartGroups,
            baseKind,
            // The rows already carry every projected column, so following the picker is a key
            // change and not another read.
            valueKey: chartValueKey,
        }) as Record<string, { range: DataViewerTimeRange; series: Array<{ name: string; data: Array<[number, number | null]> }> }>;
        if (chartRequestRef.current !== requestId) return undefined;
        setChartResults(nextResults);
        setChartNavigatorRanges((current) => {
            const next: Record<string, DataViewerTimeRange> = {};
            chartGroups.forEach((group) => {
                next[group.id] = current[group.id] || nextResults[group.id]?.range || group.range;
            });
            return next;
        });
        setChartLoading(false);
        return () => {
            chartRequestRef.current += 1;
        };
        // `activeWindow` is gone from here on purpose: `chartRowsPending` already answers everything
        // the effect asked it, and keeping both would re-run the rebuild on the commit where the
        // window lands but the rows have not — the one commit this exists to skip.
    }, [baseKind, canQuery, chartGroups, chartRowsPending, chartValueKey, mode, rows, splitChartRows]);

    const activeRange = range;
    const rangeEditorRange = useMemo(() => {
        if (rangeEditor?.type !== 'split') return activeRange;
        return splitChartRanges[rangeEditor.groupId] || activeRange;
    }, [activeRange, rangeEditor, splitChartRanges]);
    // Every base-column value on screen goes through here, so "is this a date or a number?" is
    // answered once, from the schema, rather than guessed per call site. `formatDataViewerTime`
    // reads any finite number as an epoch, which is what silently turned odometer readings into
    // 1970 timestamps.
    const formatBaseValue = useCallback((value: unknown) => formatDataViewerBaseValue(value, baseKind, timeFormat, timeZone), [baseKind, timeFormat, timeZone]);
    // Two labels, because they answer different questions. The expression is what the user typed
    // (`last-1h ~ last`); the resolved label is the literal window every query on screen actually
    // used. Showing only the expression leaves "which hour am I looking at?" unanswerable, which is
    // precisely the ambiguity the frozen window was introduced to remove. On a distance axis the two
    // coincide — a number resolves to itself — and both read as plain numbers.
    const timeRangeExpressionText = formatDataViewerBaseRangeLabel(activeRange.from, activeRange.to, baseKind);
    const resolvedRangeText = activeWindow ? `${formatBaseValue(activeWindow.from)} ~ ${formatBaseValue(activeWindow.to)}` : '';
    const timeRangeButtonText = resolvedRangeText || timeRangeExpressionText;
    const timeRangeButtonTitle = resolvedRangeText && resolvedRangeText !== timeRangeExpressionText ? `${timeRangeExpressionText} → ${resolvedRangeText}` : timeRangeButtonText;
    const timeFormatButtonText = `${getTimeFormatLabel(timeFormat)} / ${getTimeZoneLabel(timeZone)}`;
    // Resolving the window and reading rows are one operation to the user, so they share a spinner.
    // `rangeResolving` alone leaves a gap: it is cleared in the resolver's `.then`, batched with
    // `setFrozenWindow`, but `setLoading(true)` only happens in the passive-effect flush after that
    // commit. For one paint nothing is "loading" while `rows` is still empty, and the grid blinks
    // through "No data". Treating an unresolved-but-expected window as busy closes it — an error
    // means the window is not coming, so that case falls through to the real empty state.
    // `queryInputsReady && tableReadsPending` is the pair of table reads the queries are waiting on
    // — the schema and the tag list. Without it the grid would report itself idle-and-empty for the
    // length of those reads and blink "No data" before the first row query is even allowed to start;
    // on a table switch, where both are re-read, that is the whole span of the switch.
    const rawLoading = loading || rangeResolving || (queryInputsReady && tableReadsPending) || (canQuery && !activeWindow && !error);
    const handleRefreshRange = useCallback(() => {
        if (loading || endLoading || rangeResolving) return;
        // The token is part of the window key, so this re-resolves `last`/`now` against the current
        // clock. When the range is already absolute the key still changes, so the reload happens
        // anyway — a refresh that fetched nothing new would be a broken button.
        rowsRequestRef.current += 1;
        chartRequestRef.current += 1;
        endPageRequestRef.current += 1;
        setRefreshToken((current) => current + 1);
    }, [endLoading, loading, rangeResolving]);
    const handleModeChange = useCallback(
        (nextMode: 'raw' | 'chart') => {
            if (nextMode === mode) return;
            setMode(nextMode);
        },
        [mode],
    );
    // "Chart mode and a table with nothing numeric in it never coexist", enforced as an invariant
    // rather than as a second copy of the button's `disabled`. It has to be an invariant because the
    // schema lands strictly after the first paint: whoever is already looking at a chart when the
    // column read comes back has to be moved somewhere, and Raw is the honest destination — it
    // renders the same table without needing a value to be a number. Keeping `mode` in the
    // dependencies makes the rule total, so the button's `disabled` is the affordance and this is
    // the guarantee.
    useEffect(() => {
        if (!canChart && mode === 'chart') setMode('raw');
    }, [canChart, mode]);
    // A table switch drops the picked column. Keeping it would carry a key that names a different
    // column on the new table — `ex1` exists almost everywhere and means something different in
    // each — and the chart would draw it without ever looking wrong.
    useEffect(() => {
        setChartValueKeyOverride(null);
    }, [tableKey]);
    const handleEndPage = useCallback(async () => {
        if (!canQuery || endLoading) return;
        // Jumping to the last page counts the rows inside the *same* frozen window the grid is
        // showing. Re-resolving here would count a different window than the one paged through.
        const from = activeWindow?.from;
        const to = activeWindow?.to;
        if (!from || !to) return;
        const requestId = endPageRequestRef.current + 1;
        endPageRequestRef.current = requestId;
        setEndLoading(true);
        setError('');
        try {
            // The total counts cycles, not projected rows — the key fan-out happens after the read,
            // so multiplying it here would overstate the page count by the number of selected keys.
            const result = await queryTagDataTotal({
                dbName,
                userName,
                tableName,
                names: selectedTagNames,
                from,
                to,
                pageSize: rawPageSize,
                tagColumn,
                timeColumn,
                baseKind,
            });
            if (endPageRequestRef.current !== requestId) return;
            const lastPage = Number(result.lastPage || 1);
            const nextPage = Number.isFinite(lastPage) ? Math.max(1, Math.floor(lastPage)) : 1;
            const request = buildDataViewerRawPageRequest({
                currentPage: page,
                nextPage,
                pageSize: rawPageSize,
                currentBounds: rawPageBounds,
                reason: 'page',
            });
            setRawPageRequest(request);
            setPage(request.page);
        } catch (err: any) {
            if (endPageRequestRef.current !== requestId) return;
            setError(err?.message || 'Failed to calculate end page');
        } finally {
            if (endPageRequestRef.current === requestId) setEndLoading(false);
        }
    }, [activeWindow, baseKind, canQuery, dbName, endLoading, page, selectedTagNames, rawPageBounds, rawPageSize, tableName, tagColumn, timeColumn, userName]);
    // `baseKind` only renames the base column's header — the row key stays `time`, which is what the
    // cells, the widths and the page cursors all read. Header and widths share this one array, so
    // they cannot disagree about how wide `Distance` is.
    const rawColumns = useMemo<DataViewerGridColumn[]>(() => {
        const hiddenKeys = assetHierarchy ? [assetHierarchy.column || 'asset'] : [];
        // From the schema when there is one. Naming the columns from the rows means a column whose
        // values are all NULL on this page has no key to be found under, so it vanishes and comes
        // back as the reader pages through the table.
        if (columnSpecs.length > 0) return buildDataViewerGridColumns(columnSpecs, { hiddenKeys });
        return buildRawResultColumns(rows, { hiddenKeys, baseKind });
    }, [assetHierarchy, baseKind, columnSpecs, rows]);
    useEffect(() => {
        if (!rawScrollEl) return undefined;
        let alive = true;
        const measure = () => {
            const family = getComputedStyle(rawScrollEl).getPropertyValue('--font-family-mono').trim() || 'monospace';
            const context = document.createElement('canvas').getContext('2d');
            if (!context) return;
            context.font = `${RAW_CELL_FONT_SIZE}px ${family}`;
            const sample = '0123456789.-';
            // Average over a long run so sub-pixel advances do not get rounded away.
            const width = context.measureText(sample.repeat(20)).width / (sample.length * 20);
            if (alive && Number.isFinite(width) && width > 0) setRawCharWidth(width);
        };
        measure();
        document.fonts?.ready
            .then(() => {
                if (alive) measure();
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, [rawScrollEl]);
    /**
     * Which JSON cells hold a document, decided once per page rather than per render.
     *
     * The cell prints the value as it came; this only answers whether there is a tree behind it to
     * open. Asking inside the cell renderer would re-parse every visible document on every scroll
     * frame — keyed by row index and column, the page pays for it once.
     */
    const jsonDocumentCells = useMemo(() => {
        const jsonKeys = rawColumns.filter((column) => column.kind === 'json').map((column) => column.key);
        const cells = new Set<string>();
        if (jsonKeys.length === 0) return cells;

        rows.forEach((row, index) => {
            jsonKeys.forEach((key) => {
                if (isJsonKeyDocument(row?.[key])) cells.add(`${index}:${key}`);
            });
        });
        return cells;
    }, [rawColumns, rows]);
    const rawColumnWidths = useMemo(
        () =>
            buildRawColumnWidths(rows, rawColumns, {
                timeSample: rows.length ? formatBaseValue(rows[0].time) : '',
                // The dot is drawn inside the name cell, so its footprint has to be part of the
                // column width or `text-overflow: ellipsis` eats the tail of every tag name.
                extra: { name: RAW_NAME_DOT_SPACE },
                charWidth: rawCharWidth,
            }),
        [formatBaseValue, rawCharWidth, rawColumns, rows],
    );
    const rawNameColors = useMemo(() => buildRawRowNameColors(rows), [rows]);
    // One colour per tag for every panel. Taken from the "default" group — it always holds all the
    // selected tags, in the order the palette was walked — so splitting a tag into its own chart
    // keeps the colour it had in the main one instead of restarting the palette at its first entry.
    // Without this every split panel is the same blue, and none of them agrees with the tag's dot in
    // the raw grid. Falls back to the raw row order before any chart result exists, which is the
    // ordering `buildTagChartSeries` would produce anyway.
    const seriesColors = useMemo(() => {
        const mainSeries = chartResults.default?.series;
        if (!Array.isArray(mainSeries) || mainSeries.length === 0) return rawNameColors;
        return buildSeriesColorMap(mainSeries.map((item) => item?.name));
    }, [chartResults, rawNameColors]);
    const rawTableMinWidth = useMemo(() => rawColumns.reduce((total, column) => total + (rawColumnWidths[column.key] || 0), 0), [rawColumnWidths, rawColumns]);
    // Memoised because react-virtuoso subscribes to `components.Table` with a strict-equality
    // `distinctUntilChanged` — a fresh component identity on every render remounts the whole
    // `<table>` (and with it the scroll position) on each keystroke elsewhere in the page.
    const rawComponents = useMemo<TableComponents<ResultRow>>(
        () => ({
            // The whole row opens the detail. Confining it to the value cell made the target a
            // sliver of the row, and the cell is also the one part a user may want to select text in.
            TableRow: (props) => {
                // `item` is the row object Virtuoso passes alongside the DOM props; spreading it onto
                // a <tr> would emit it as an attribute. The index it also passes is what the detail
                // view needs, since that view moves between rows on its own.
                const { item, ...rest } = props as typeof props & { item?: unknown };
                void item;
                const index = rest['data-index'] as number;
                // The row is the only door into the key flow, so it has to be a control and not just
                // a click target: a bare `<tr onClick>` is invisible to the keyboard, and a 120-press
                // Tab sweep in both directions never once landed inside this grid. `role="button"`
                // over the row rather than a nested one keeps the whole row as the target, which is
                // what the pointer already gets.
                return (
                    <tr
                        {...rest}
                        className="data-viewer-raw-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => rawRowClickRef.current(index)}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            // Space scrolls the grid otherwise, which moves the row out from under
                            // the press that was meant to open it.
                            event.preventDefault();
                            rawRowClickRef.current(index);
                        }}
                    />
                );
            },
            Table: ({ style, children, ...props }) => (
                // `children` has to be destructured and re-rendered after the colgroup: TableProps
                // carries thead/tbody as a `children` prop, so writing JSX children on a spread
                // `<table {...props}>` would overwrite them and leave an empty grid.
                <table {...props} className="table-clean data-viewer-raw-table" style={{ ...style, minWidth: rawTableMinWidth }}>
                    <colgroup>
                        {rawColumns.map((column) => (
                            <col key={column.key} style={{ width: rawColumnWidths[column.key] }} />
                        ))}
                    </colgroup>
                    {children}
                </table>
            ),
        }),
        [rawColumns, rawColumnWidths, rawTableMinWidth],
    );
    const handleRangeApply = useCallback(
        async (next: DataViewerTimeRange) => {
            // The shared TimeRangeModal happily saves an empty side — dashboards treat that as
            // "open-ended". The Data Viewer cannot: an open edge is an unbounded scan. Rejecting it
            // here rather than inside the modal keeps every other consumer of the modal untouched.
            // The editor is closed so the reason lands in the page's error box, which the modal
            // overlay would otherwise cover.
            const requiredMessage = baseKind === 'distance' ? DISTANCE_RANGE_REQUIRED_MESSAGE : TIME_RANGE_REQUIRED_MESSAGE;
            if (!String(next.from ?? '').trim() || !String(next.to ?? '').trim()) {
                if (rangeEditor?.type === 'split') setChartError(requiredMessage);
                else setError(requiredMessage);
                setRangeEditor(null);
                return;
            }
            if (rangeEditor?.type === 'split' && rangeEditor.groupId) {
                const group = chartGroups.find((chartGroup) => chartGroup.id === rangeEditor.groupId);
                if (!group) {
                    setRangeEditor(null);
                    return;
                }
                const currentRange = splitChartRanges[rangeEditor.groupId] || { from: '', to: '' };
                const rangeChanged = currentRange.from !== next.from || currentRange.to !== next.to;
                let nextRows: ResultRow[] | null = null;
                let nextResolvedRange: DataViewerTimeRange | null = null;
                if (rangeChanged && canQuery) {
                    const splitRequestId = splitRangeRequestRef.current + 1;
                    splitRangeRequestRef.current = splitRequestId;
                    setChartError('');
                    try {
                        const { from, to } = await resolveRangeForTagNames(next, group.tagNames);
                        if (splitRangeRequestRef.current !== splitRequestId) return;
                        if (from === null || to === null) {
                            setChartError(baseKind === 'distance' ? DISTANCE_RANGE_INVALID_MESSAGE : TIME_RANGE_INVALID_MESSAGE);
                            return;
                        }
                        if (!from || !to) {
                            setChartError(requiredMessage);
                            return;
                        }
                        if (isDataViewerRangeReversed(from, to, baseKind)) {
                            setChartError(baseKind === 'distance' ? DISTANCE_RANGE_ORDER_MESSAGE : TIME_RANGE_ORDER_MESSAGE);
                            return;
                        }
                        const result = await queryTagData({
                            dbName,
                            userName,
                            tableName,
                            names: group.tagNames,
                            direction: backwardScan ? 'latest' : 'oldest',
                            from,
                            to,
                            page: 1,
                            pageSize: getDataViewerRawPageSize(group.tagNames, rawRowsPerTag),
                            tagColumn,
                            timeColumn,
                            valueColumn,
                            extraColumns: chartExtraColumns,
                            baseKind,
                            boundedRange: true,
                        });
                        if (splitRangeRequestRef.current !== splitRequestId) return;
                        nextRows = result.rows;
                        nextResolvedRange = { from: from ?? '', to: to ?? '' };
                    } catch (err: any) {
                        if (splitRangeRequestRef.current !== splitRequestId) return;
                        setChartError(err?.message || 'Failed to update chart range');
                        return;
                    }
                }
                if (rangeChanged) {
                    chartRequestRef.current += 1;
                    setChartViewRanges((current) => {
                        if (!Object.prototype.hasOwnProperty.call(current, rangeEditor.groupId)) return current;
                        const { [rangeEditor.groupId]: _removed, ...rest } = current;
                        return rest;
                    });
                    setChartNavigatorRanges((current) => {
                        if (!Object.prototype.hasOwnProperty.call(current, rangeEditor.groupId)) return current;
                        const { [rangeEditor.groupId]: _removed, ...rest } = current;
                        return rest;
                    });
                }
                setSplitChartRanges((current) => ({
                    ...current,
                    [rangeEditor.groupId]: next,
                }));
                if (nextRows) {
                    chartRequestRef.current += 1;
                    if (nextResolvedRange) {
                        setResolvedSplitChartRanges((current) => ({
                            ...current,
                            [rangeEditor.groupId]: nextResolvedRange,
                        }));
                    }
                    setSplitChartRows((current) => ({
                        ...current,
                        [rangeEditor.groupId]: nextRows,
                    }));
                }
            } else {
                chartRequestRef.current += 1;
                setChartViewRanges({});
                setChartNavigatorRanges({});
                rowsRequestRef.current += 1;
                endPageRequestRef.current += 1;
                setRangeOverride(next);
                setRawPageBounds(null);
                setRawPageRequest(toFirstPageRequest);
                setPage(1);
            }
            setRangeEditor(null);
        },
        [backwardScan, baseKind, canQuery, chartExtraColumns, chartGroups, dbName, rangeEditor, rawRowsPerTag, resolveRangeForTagNames, splitChartRanges, tableName, tagColumn, timeColumn, userName, valueColumn],
    );
    const handleOpenTagAnalyzer = useCallback(
        (
            group: { id: string; title: string; tagNames: string[]; range: { from?: unknown; to?: unknown } },
            chartData?: { range?: DataViewerTimeRange },
        ) => {
            // Tag Analyzer opens a board whose every tag carries `calculationMode: 'avg'` over one
            // column. Averaging a document — or a string, or nothing at all — yields nothing, so the
            // board would open empty and blame itself. `chartValueSpec` is the column being drawn,
            // and its absence is exactly the case where there is no numeric column to hand over.
            //
            // Today this line cannot fire: the only entry point is the chart panel's action menu,
            // and chart mode is already closed for a table with nothing chartable in it, so the menu
            // is not on screen to be clicked. It is kept deliberately, and its redundancy is the
            // reason it is one line — the reachability is a property of where the entry point
            // happens to live, not of the rule, and a second entry point (raw's own toolbar, a
            // keyboard shortcut) would make it load-bearing without anyone remembering to add it.
            if (!canChart || !chartValueSpec) return;

            const tazRange = chartViewRanges[group.id] || chartData?.range || group.range;
            const normalizedRange = buildDataViewerTagAnalyzerRange(tazRange, baseKind);
            const tagAnalyzerTable = buildDataViewerTagAnalyzerTableName({
                dbName,
                userName,
                tableName,
                databaseId,
                currentUserName: getUserName(),
            });

            const payload = {
                title: group.title || 'Data Viewer',
                ...(normalizedRange ? { range: normalizedRange } : {}),
                tags: group.tagNames.map((tagName) => ({
                    tagName,
                    table: tagAnalyzerTable,
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1,
                    // The base column, named and typed as this table actually declares it. Tag
                    // Analyzer derives its own axis from exactly this pair — BASETIME plus a
                    // non-DATETIME type means a numeric axis — so hardcoding the DATETIME type
                    // here would silently overrule the schema and open a distance table on a time
                    // axis. `baseColumn` rather than `timeColumn` for the same reason: on a
                    // distance table `timeColumn` is only the fallback the resolver started from.
                    colName: {
                        name: tagColumn,
                        time: baseColumn,
                        // The column the chart is drawing, which is the one the reader is looking
                        // at when they open this menu — not necessarily the summarized column.
                        value: chartValueSpec.name,
                        timeType: baseColumnType,
                        timeBaseTime: true,
                        jsonKey: '',
                    },
                })),
            };

            const result = createTagAnalyzerBoardFromPayload(payload);
            if (result.status !== 'ok') {
                setError(result.reason || 'Cannot open Tag Analyzer.');
                return;
            }
            setBoardList((current) => [...current, result.board]);
            setSelectedTab(result.board.id);
        },
        [baseColumn, baseColumnType, baseKind, canChart, chartValueSpec, chartViewRanges, databaseId, dbName, setBoardList, setSelectedTab, tableName, tagColumn, userName],
    );
    /**
     * What a row click opens: the row inspector, on every table.
     *
     * This used to fork on whether the value column held JSON, and go straight to the key picker
     * when it did — right while a row had one interesting value in it. A row of several columns has
     * no single type, so that fork has no answer to give: keeping it conditional would mean the same
     * click opens different things depending on the table's schema, which is a rule nobody can hold.
     *
     * The picker is not lost, it moved down one level. A JSON cell carries its own control (see
     * `openJsonKeyPicker`), and so does the matching field inside the inspector — so both routes
     * reach the same place, and the cell route names the column instead of assuming it.
     */
    const handleRawRowClick = useCallback(
        (index: number) => {
            if (!rows[index]) return;
            setRowDetailIndex(index);
        },
        [rows],
    );

    /**
     * Open one cell's document as a key tree.
     *
     * Keyed by row index and column key rather than handed the document, so the two entry points —
     * a cell in the grid, a field in the inspector — cannot drift about which row they mean.
     */
    const openJsonKeyPicker = useCallback(
        (index: number, columnKey: string) => {
            const row = rows[index];
            const spec = columnSpecByKey.get(columnKey);
            if (!row || !spec) return;
            const document = row[columnKey];
            // A cell holding something that is not a document at all has no tree to show; the
            // inspector, which prints it as it came, is the whole answer there.
            if (!jsonKeyDocumentHasKeys(document)) return;
            // A different cell is a different document, so the filter and folds kept for the trip
            // into the detail view and back do not carry over to it.
            jsonKeyPickerViewRef.current = undefined;
            setJsonKeyPicker({
                tagName: String(row.name ?? ''),
                baseLabel: formatBaseValue(row.time),
                columnName: spec.name,
                document,
                selected: [],
            });
        },
        [columnSpecByKey, formatBaseValue, rows],
    );

    /**
     * Close every dialog this page has open.
     *
     * They are portalled to `<body>`, and the board itself stays mounted when another tab is
     * selected — so a dialog left standing paints over whatever the user was sent to. That is what
     * the Tag Analyzer handoff does: it opens a board and switches to it, and the row inspector the
     * keys were reached from used to stay up on top of the new tab.
     */
    const closeRowDialogs = useCallback(() => {
        setRowDetailIndex(null);
        setTextCell(null);
        setJsonKeyDetail(null);
        setJsonKeyPicker(null);
    }, []);

    /**
     * The cell whose value was just copied, so its button can say so.
     *
     * One at a time: the hint belongs to the press, and two ticks on screen would leave the reader
     * working out which one was theirs.
     */
    const [copiedCell, setCopiedCell] = useState<string | null>(null);
    const copiedCellTimer = useRef<number>(0);
    useEffect(() => () => window.clearTimeout(copiedCellTimer.current), []);
    const copyCellValue = useCallback((cellKey: string, text: string) => {
        writeClipboard(text, null).then((ok) => {
            if (!ok) return;
            window.clearTimeout(copiedCellTimer.current);
            setCopiedCell(cellKey);
            copiedCellTimer.current = window.setTimeout(() => setCopiedCell(null), RAW_CELL_COPY_HINT_MS);
        });
    }, []);

    /** Open one cell's text at full size — the grid gives it one ellipsised line. */
    const openTextCell = useCallback(
        (index: number, columnKey: string, label: string) => {
            if (!rows[index]) return;
            setTextCell({ index, key: columnKey, label });
        },
        [rows],
    );

    /**
     * The row click, held where the memo below can reach it without depending on it.
     *
     * `rawComponents` has to keep one identity for the life of the grid — Virtuoso remounts the
     * whole table when it changes — but the handler moves with `rows`, so listing it as a dependency
     * would rebuild the memo on every read. Reading it through a ref keeps both: a stable table and
     * a handler that is never a page behind.
     */
    const rawRowClickRef = useRef(handleRawRowClick);
    useEffect(() => {
        rawRowClickRef.current = handleRawRowClick;
    }, [handleRawRowClick]);

    // The table name Tag Analyzer receives, resolved once so the confirm dialog states exactly the
    // string the board will be built with rather than a second rendering of it.
    const tagAnalyzerTableName = useMemo(
        () => buildDataViewerTagAnalyzerTableName({ dbName, userName, tableName, databaseId, currentUserName: getUserName() }),
        [databaseId, dbName, tableName, userName],
    );

    /**
     * Open a board on one tag's JSON keys.
     *
     * Deliberately not `handleOpenTagAnalyzer`: that one refuses a JSON value column outright,
     * because averaging a document yields nothing. Here a key has been picked, so what is handed
     * over is a number — the `jsonKey` field is what turns the board's projection from the document
     * into that key, and it is the whole reason this path exists.
     */
    /** Returns false when nothing opened, so the caller can leave the flow standing. */
    const handleOpenTagAnalyzerJsonKeys = useCallback(
        (tagName: string, columnName: string, paths: string[], window: { from?: string | number; to?: string | number }): boolean => {
            const normalizedRange = buildDataViewerTagAnalyzerRange({ from: window.from, to: window.to }, baseKind);

            // Querying a long key is fine; it is only Tag Analyzer's own field that cannot hold one,
            // so the check belongs here. An empty path is the column itself and passes through as an
            // empty `jsonKey`, which is exactly how Tag Analyzer says "no key".
            const converted = paths.map((path) => (path ? toTagAnalyzerJsonKeyPath(path) : ({ ok: true, path: '' } as const)));
            const jsonKeys = converted.flatMap((entry) => (entry.ok ? [entry.path] : []));
            if (jsonKeys.length === 0) {
                const refused = converted.flatMap((entry) => (entry.ok ? [] : [entry.reason]));
                setError(refused[0] || 'Cannot open Tag Analyzer.');
                return false;
            }

            const payload = {
                title: tagName || 'Data Viewer',
                ...(normalizedRange ? { range: normalizedRange } : {}),
                tags: jsonKeys.map((jsonKey) => ({
                    tagName,
                    table: tagAnalyzerTableName,
                    calculationMode: TAG_ANALYZER_JSON_CALCULATION_MODE,
                    alias: '',
                    weight: 1,
                    // Same contract as the non-JSON handoff above — see its note on `colName` —
                    // plus the key, which is the one field that differs.
                    colName: {
                        name: tagColumn,
                        time: baseColumn,
                        // The column the keys were picked from, which is not necessarily the
                        // summarized one now that any JSON column in the row can be opened.
                        value: columnName || valueColumn,
                        timeType: baseColumnType,
                        timeBaseTime: true,
                        jsonKey,
                    },
                })),
            };

            const result = createTagAnalyzerBoardFromPayload(payload);
            if (result.status !== 'ok') {
                setError(result.reason || 'Cannot open Tag Analyzer.');
                return false;
            }
            setBoardList((current) => [...current, result.board]);
            setSelectedTab(result.board.id);
            return true;
        },
        [baseColumn, baseColumnType, baseKind, setBoardList, setSelectedTab, tagAnalyzerTableName, tagColumn, valueColumn],
    );
    const handleSetGlobalTime = useCallback(
        async (groupId: string) => {
            // `baseKind` decides the units the copied range comes back in. Without it a distance
            // panel's window is date-parsed and written back as an ISO string, which the next
            // distance query cannot read — and 0 ~ 1000 does not even survive the parse.
            const update = buildDataViewerGlobalTimeUpdate({
                sourceGroupId: groupId,
                chartGroups,
                chartViewRanges,
                chartNavigatorRanges,
                chartResults,
                baseKind,
            });
            if (!update) {
                setError('Cannot set global time from this chart.');
                return;
            }

            rowsRequestRef.current += 1;
            endPageRequestRef.current += 1;
            chartRequestRef.current += 1;
            const splitRequestId = splitRangeRequestRef.current + 1;
            splitRangeRequestRef.current = splitRequestId;
            setRangeOverride(update.range);
            setRawPageBounds(null);
            setRawPageRequest(toFirstPageRequest);
            setPage(1);
            setChartViewRanges(update.viewRanges);
            setChartNavigatorRanges(update.navigatorRanges);
            setSplitChartRanges(update.splitRanges);
            setResolvedSplitChartRanges(update.splitRanges);
            const splitGroupsToFetch = chartGroups.filter((group) => group.id !== 'default' && update.splitRanges[group.id]);
            setSplitChartRows(Object.fromEntries(splitGroupsToFetch.map((group) => [group.id, []])));

            if (!canQuery || splitGroupsToFetch.length === 0) return;

            try {
                const nextEntries = await Promise.all(
                    splitGroupsToFetch.map(async (group) => {
                        const groupRange = update.splitRanges[group.id];
                        const result = await queryTagData({
                            dbName,
                            userName,
                            tableName,
                            names: group.tagNames,
                            direction: backwardScan ? 'latest' : 'oldest',
                            from: groupRange.from,
                            to: groupRange.to,
                            page: 1,
                            pageSize: getDataViewerRawPageSize(group.tagNames, rawRowsPerTag),
                            tagColumn,
                            timeColumn,
                            valueColumn,
                            extraColumns: chartExtraColumns,
                            baseKind,
                            boundedRange: true,
                        });
                        return [group.id, result.rows] as const;
                    }),
                );
                if (splitRangeRequestRef.current !== splitRequestId) return;
                chartRequestRef.current += 1;
                setSplitChartRows(Object.fromEntries(nextEntries));
            } catch (err: any) {
                if (splitRangeRequestRef.current !== splitRequestId) return;
                setChartError(err?.message || 'Failed to set global time');
            }
        },
        [
            backwardScan,
            baseKind,
            canQuery,
            chartExtraColumns,
            chartGroups,
            chartNavigatorRanges,
            chartResults,
            chartViewRanges,
            dbName,
            rawRowsPerTag,
            tableName,
            tagColumn,
            timeColumn,
            userName,
            valueColumn,
        ],
    );
    const handleShiftMainRange = useCallback(
        async (
            group: { id: string; tagNames: string[] },
            direction: 'backward' | 'forward',
            currentRange: any,
            navigatorRange: any,
        ) => {
            if (!canQuery) return;
            if (group.id === 'default') {
                const update = buildDataViewerDefaultChartShiftRawPageUpdate({
                    direction,
                    backwardScan,
                    currentPage: page,
                    pageSize: rawPageSize,
                    rowCount: rows.length,
                    forceNextPage: Boolean(rawPageRequest?.boundedRange),
                    currentBounds: rawPageBounds,
                });
                if (!update) {
                    return;
                }
                rowsRequestRef.current += 1;
                setChartError('');
                setChartViewRanges((current) => {
                    const { default: _defaultRange, ...next } = current;
                    return next;
                });
                setChartNavigatorRanges((current) => {
                    const { default: _defaultRange, ...next } = current;
                    return next;
                });
                setRawPageRequest(update.rawPageRequest);
                setPage(update.page);
                return;
            }

            const update = buildDataViewerShiftMainRangeUpdate({ direction, currentRange, navigatorRange, baseKind });
            if (!update) {
                return;
            }

            chartRequestRef.current += 1;
            const splitRequestId = splitRangeRequestRef.current + 1;
            splitRangeRequestRef.current = splitRequestId;
            setChartError('');
            setChartViewRanges((current) => ({
                ...current,
                [group.id]: update.range,
            }));
            setChartNavigatorRanges((current) => ({
                ...current,
                [group.id]: update.navigatorRange,
            }));

            setSplitChartRanges((current) => ({
                ...current,
                [group.id]: update.navigatorRange,
            }));
            setResolvedSplitChartRanges((current) => ({
                ...current,
                [group.id]: update.navigatorRange,
            }));

            try {
                const result = await queryTagData({
                    dbName,
                    userName,
                    tableName,
                    names: group.tagNames,
                    direction: backwardScan ? 'latest' : 'oldest',
                    from: update.navigatorRange.from,
                    to: update.navigatorRange.to,
                    page: 1,
                    pageSize: getDataViewerRawPageSize(group.tagNames, rawRowsPerTag),
                    tagColumn,
                    timeColumn,
                    valueColumn,
                    extraColumns: chartExtraColumns,
                    baseKind,
                    boundedRange: true,
                });
                if (splitRangeRequestRef.current !== splitRequestId) return;
                const nextRows = result.rows;
                chartRequestRef.current += 1;
                setSplitChartRows((current) => ({
                    ...current,
                    [group.id]: nextRows,
                }));
            } catch (err: any) {
                if (splitRangeRequestRef.current !== splitRequestId) return;
                setChartError(err?.message || 'Failed to move chart range');
            }
        },
        [backwardScan, baseKind, canQuery, chartExtraColumns, dbName, page, rawPageBounds, rawPageSize, rawRowsPerTag, tableName, tagColumn, timeColumn, userName, valueColumn],
    );

    // Opening the range editor is the same act on both axes; which editor appears is decided in one
    // place, `renderRangeEditor` below.
    const handleOpenGlobalRangeEditor = useCallback(() => {
        setRangeEditor({ type: 'global' });
    }, []);

    // The chip's chevrons move the *window*, by its own width, exactly as the label beside them
    // promises: `0 ~ 1000` becomes `1000 ~ 2000`.
    //
    // They used to be routed into `handleShiftMainRange` with `id: 'default'`, which is the branch
    // that pages the raw grid — a different operation with a different failure mode. It was dead on
    // arrival in the common case: with backward scan on (the default) `▶` walks page 2 → 1, so on
    // page 1 there was no page to go to and nothing happened, and `◀` needed a full page of rows
    // before it would open page 2. Both axes, both chevrons. And when it *did* fire it moved the
    // page while leaving the range — the very thing the chip is showing — untouched, so the control
    // read as broken even on the path where it worked.
    //
    // The window it steps is the *resolved* one, not the expression: `last-1h ~ last` has no
    // arithmetic in it, and the user is pointing at the hour on screen, not at the token. Falling
    // back to `activeRange` covers the distance axis before the first resolution, where the two are
    // the same numbers anyway.
    const handleShiftBaseRange = useCallback(
        (direction: 'backward' | 'forward') => {
            if (!canQuery) return;
            const update = buildDataViewerShiftBaseRangeUpdate({
                direction,
                range: activeWindow ? { from: activeWindow.from, to: activeWindow.to } : activeRange,
                baseKind,
            });
            if (!update) return;

            // The same reset `handleRangeApply` performs for a typed range — this is the same act,
            // reached by a different control. A window that moved has no page 4 to still be on.
            rowsRequestRef.current += 1;
            chartRequestRef.current += 1;
            endPageRequestRef.current += 1;
            setError('');
            setChartError('');
            setChartViewRanges({});
            setChartNavigatorRanges({});
            setRangeOverride(update);
            setRawPageBounds(null);
            setRawPageRequest(toFirstPageRequest);
            setPage(1);
        },
        [activeRange, activeWindow, baseKind, canQuery],
    );

    return (
        <div className={`neo-data-viewer${embedded ? ' neo-data-viewer-embedded-tab' : ''}`}>
            <header className="page-header">
                <div className="page-header-inner">
                    <div className="data-viewer-header-title">
                        <MaterialIcon name="query_stats" className="text-primary" />
                        <h2 className="page-title truncate">{headerLabels.title}</h2>
                        {headerLabels.detail ? <span className="badge badge-muted truncate">{headerLabels.detail}</span> : null}
                    </div>
                </div>
            </header>

            <main className="page-body-full data-viewer-body">
                <div className="page-body-inner">
                    <div className="data-viewer-layout">
                        <aside className="form-card data-viewer-tags">
                            {!assetHierarchy ? (
                                <div className="form-card-header data-viewer-tags-header">
                                    <span className="section-dot" />
                                    Tags
                                </div>
                            ) : null}
                            {assetHierarchy ? (
                                <div className="data-viewer-tag-tabs" role="tablist" aria-label="Tag views">
                                    <button
                                        type="button"
                                        className={`data-viewer-tag-tab ${activeTagTab === 'tags' ? 'is-active' : ''}`}
                                        onClick={() => setActiveTagTab('tags')}
                                        role="tab"
                                        aria-selected={activeTagTab === 'tags'}
                                    >
                                        Tags
                                    </button>
                                    <button
                                        type="button"
                                        className={`data-viewer-tag-tab ${activeTagTab === 'asset' ? 'is-active' : ''}`}
                                        onClick={() => setActiveTagTab('asset')}
                                        role="tab"
                                        aria-selected={activeTagTab === 'asset'}
                                    >
                                        Hierarchy
                                    </button>
                                </div>
                            ) : null}
                            <div className="data-viewer-tag-search">
                                <input className="w-full" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="Filter tags..." />
                            </div>
                            <div className="data-viewer-tag-list">
                                {tagsLoading ? <div className="empty-state">Loading tags...</div> : null}
                                {!tagsLoading && activeTagTab === 'tags' && visibleTags.length === 0 ? <div className="empty-state">No tags</div> : null}
                                {!tagsLoading && activeTagTab === 'asset' && assetRows.length === 0 ? <div className="empty-state">No asset tags</div> : null}
                                {activeTagTab === 'tags'

                                    ? visibleTags.map((tag) => {
                                          const checked = selectedTagNames.includes(tag.name);
                                          return (
                                              <label key={`tag:${tag.name}`} className={`data-viewer-tag-row ${checked ? 'is-active' : ''}`} title={tag.name}>
                                                  <span className="node-tree-toggle">
                                                      <input type="checkbox" checked={checked} onChange={() => handleTagSelectionChange(tag.name)} aria-label={`${tag.name} select`} />
                                                  </span>
                                                  <span className="node-tree-label truncate">{tag.name}</span>
                                                  {tag.dataType ? <span className="badge badge-success">{tag.dataType}</span> : null}
                                              </label>
                                          );
                                      })
                                    : assetRows.map((row) => {
                                          // Depth is handed to CSS as a variable rather than as `padding-left`: an inline
                                          // `padding-left` replaces the row's own, which zeroes it at depth 0 and puts the
                                          // checkbox on top of the selected row's accent bar. The stylesheet adds the two.
                                          const treeIndent = { '--tree-indent': `${row.depth * 16}px` } as React.CSSProperties;
                                          if (row.type === 'folder') {
                                              const collapsed = collapsedAssetFolders.has(row.id);
                                              return (
                                                  <div key={row.id} className="node-tree-row node-tree-row-folder" style={treeIndent} title={row.label}>
                                                      <button type="button" className="node-tree-toggle" onClick={() => toggleAssetFolder(row.id)} aria-label={`${row.label} ${collapsed ? 'expand' : 'collapse'}`}>
                                                          {collapsed ? <VscChevronRight className="icon-sm" /> : <VscChevronDown className="icon-sm" />}
                                                      </button>
                                                      <span className="node-tree-label truncate">{row.label}</span>
                                                  </div>
                                              );
                                          }

                                          const checked = selectedTagNames.includes(row.name);
                                          return (
                                              <label
                                                  key={row.id}
                                                  className={`data-viewer-tag-row ${checked ? 'is-active' : ''}`}
                                                  style={treeIndent}
                                                  title={row.name}
                                              >
                                                  <span className="node-tree-toggle">
                                                      <input type="checkbox" checked={checked} onChange={() => handleTagSelectionChange(row.name)} aria-label={`${row.name} select`} />
                                                  </span>
                                                  <span className="node-tree-label truncate">{row.label}</span>
                                                  {row.dataType ? <span className="badge badge-success">{row.dataType}</span> : null}
                                              </label>
                                          );
                                      })}
                            </div>
                        </aside>

                        <section className="form-card data-viewer-results">
                            <div className="data-viewer-toolbar">
                                <div className="data-viewer-title-row">
                                    {/* Anchored at the head of the toolbar: the refresh control, with the frozen
                                        window it re-resolves spelled out directly beneath it. Everything to the
                                        right is pushed away by `.data-viewer-title-actions`' auto margin. */}
                                    <div className="data-viewer-range-anchor">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-ghost data-viewer-time-range-refresh"
                                            title="Re-apply the time range and reload"
                                            onClick={handleRefreshRange}
                                            disabled={rawLoading || endLoading}
                                            aria-label="Refresh time range"
                                        >
                                            <MdRefresh className="icon-sm" />
                                        </button>
                                        {resolvedRangeText ? (
                                            <span className="data-viewer-time-range-resolved" title={resolvedRangeText}>
                                                {resolvedRangeText}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="data-viewer-title-actions">
                                        {mode === 'raw' ? (
                                            <div className="data-viewer-segmented data-viewer-scan-control" role="group" aria-label="Scan direction">
                                                <button
                                                    type="button"
                                                    className={`data-viewer-segmented-item ${backwardScan ? 'is-active' : ''}`}
                                                    onClick={() => setBackwardScan(true)}
                                                    aria-pressed={backwardScan}
                                                >
                                                    Backward
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`data-viewer-segmented-item ${!backwardScan ? 'is-active' : ''}`}
                                                    onClick={() => setBackwardScan(false)}
                                                    aria-pressed={!backwardScan}
                                                >
                                                    Forward
                                                </button>
                                            </div>
                                        ) : null}
                                        <div className="data-viewer-query-controls">
                                            {/* A time format and a timezone say nothing about a distance, and nothing on a
                                                distance axis reads either of them — `formatDataViewerBaseValue` routes to
                                                `formatDataViewerDistance` and the axis/tooltip formatters take the numeric
                                                path. So the button is not rendered rather than disabled: a disabled control
                                                still claims there is a setting here worth having, and there is not. The
                                                `timeFormat`/`timeZone` state stays — the time axis is still the common case. */}
                                            {baseKind === 'distance' ? null : (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-ghost data-viewer-format-button"
                                                    title={timeFormatButtonText}
                                                    onClick={() => setFormatOpen(true)}
                                                    aria-label="Set time format and timezone"
                                                >
                                                    <MaterialIcon name="public" className="icon-sm" />
                                                </button>
                                            )}
                                            {/* Range chip, matching the dashboard's RangeChips: [axis][◀][value][▶].
                                                The chip body opens the range editor; the chevrons stop propagation and
                                                only shift. `aria-label` stays "Set time range" — it is what identifies
                                                this control to the tests and to a screen reader. */}
                                            <div
                                                className={`data-viewer-range-chip data-viewer-range-chip-${baseKind}`}
                                                role="button"
                                                tabIndex={0}
                                                title={timeRangeButtonTitle}
                                                aria-label="Set time range"
                                                onClick={handleOpenGlobalRangeEditor}
                                                onKeyDown={(event) => {
                                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                                    event.preventDefault();
                                                    handleOpenGlobalRangeEditor();
                                                }}
                                            >
                                                <span className="data-viewer-range-chip-axis">{baseAxisLabel}</span>
                                                <button
                                                    type="button"
                                                    className="data-viewer-range-chip-chevron"
                                                    aria-label={`${baseAxisLabel} previous`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleShiftBaseRange('backward');
                                                    }}
                                                >
                                                    <VscChevronLeft />
                                                </button>
                                                <span className="data-viewer-range-chip-value">{timeRangeExpressionText}</span>
                                                <button
                                                    type="button"
                                                    className="data-viewer-range-chip-chevron"
                                                    aria-label={`${baseAxisLabel} next`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleShiftBaseRange('forward');
                                                    }}
                                                >
                                                    <VscChevronRight />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="data-viewer-segmented data-viewer-mode-control" role="tablist" aria-label="Result mode">
                                            <button type="button" role="tab" aria-selected={mode === 'raw'} className={`data-viewer-segmented-item ${mode === 'raw' ? 'is-active' : ''}`} onClick={() => handleModeChange('raw')}>
                                                Raw
                                            </button>
                                            {/* Not rendered at all on a table with nothing numeric in it, rather
                                                than rendered disabled: a dead segment still presents Chart as a
                                                mode this table has, and the control reads as broken instead of as
                                                a table that only does Raw. Same call as the format/timezone button
                                                on a distance axis. The mode invariant effect keeps `mode` on
                                                'raw', so the remaining segment is always the selected one. */}
                                            {!canChart ? null : (
                                                <button
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={mode === 'chart'}
                                                    className={`data-viewer-segmented-item ${mode === 'chart' ? 'is-active' : ''}`}
                                                    onClick={() => handleModeChange('chart')}
                                                >
                                                    Chart
                                                </button>
                                            )}
                                        </div>
                                        {/* Only when there is a choice to make. A table with one
                                            numeric column has a value column and always did; putting
                                            a one-entry picker beside it would present a decision
                                            that does not exist. */}
                                        {mode === 'chart' && chartValueColumns.length > 1 ? (
                                            <label className="data-viewer-chart-column">
                                                <span className="data-viewer-chart-column-label">Value</span>
                                                <select
                                                    value={chartValueKey}
                                                    onChange={(event) => setChartValueKeyOverride(event.target.value)}
                                                    aria-label="Charted column"
                                                    title="Which column the chart draws"
                                                >
                                                    {chartValueColumns.map((spec) => (
                                                        <option key={spec.key} value={spec.key}>
                                                            {spec.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            {error ? <div className="error-box">{error}</div> : null}
                            {/* Gated on the inputs, not on `canQuery` — otherwise a table whose schema
                                is still being read would be told to pick a tag it has already got.
                                A JSON value column is not part of this: Raw serves it normally, so
                                there is nothing to say here about it. */}
                            {!queryInputsReady && !error ? <div className="empty-state">Database table and tag are required</div> : null}
                            {queryInputsReady && mode === 'raw' ? (
                                <div className="table-card data-viewer-raw-card">
                                    <div className="table-card-body" ref={setRawScrollEl}>
                                        {rawScrollEl ? (
                                            <TableVirtuoso
                                                data={rows}
                                                customScrollParent={rawScrollEl}
                                                fixedItemHeight={RAW_ROW_HEIGHT}
                                                components={rawComponents}
                                                fixedHeaderContent={() => (
                                                    <tr>
                                                        {rawColumns.map((column) => (
                                                            // `is-numeric` right-aligns a column of numbers — and only that. A JSON
                                                            // document right-aligned starts at a different x per row, which makes a
                                                            // column of documents unreadable. The header carries it too so the label
                                                            // sits over the digits instead of drifting to the far edge. The base
                                                            // column is left alone on both axes: a distance base is numeric, but
                                                            // realigning it would move a column that has never moved.
                                                            <th key={column.key} className={column.key !== 'time' && column.kind === 'number' ? 'is-numeric' : undefined}>
                                                                {column.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                )}
                                                itemContent={(index, row) => (
                                                    // Cells only — TableVirtuoso's default TableRow already supplies the `<tr>`.
                                                    <>
                                                        {rawColumns.map((column) => {
                                                            const raw = row[column.key];
                                                            // A NULL reads as `NULL` here for the same reason it does in the SQL
                                                            // result grid: a blank cell is indistinguishable from an empty string.
                                                            // The base column cannot be null — it is the BASETIME column — and
                                                            // neither can the tag, which is the primary key.
                                                            const isNull = column.key !== 'time' && (raw === null || raw === undefined);

                                                            if (column.key === 'time') {
                                                                return (
                                                                    <td key={column.key} className="mono">
                                                                        {formatBaseValue(raw)}
                                                                    </td>
                                                                );
                                                            }
                                                            if (column.key === 'name') {
                                                                const name = String(raw ?? '');
                                                                // `--raw-dot` feeds the ::before swatch, which ties a row back to its chart line.
                                                                return (
                                                                    <td key={column.key} className="mono raw-name" style={{ '--raw-dot': rawNameColors[name] } as React.CSSProperties}>
                                                                        {name}
                                                                    </td>
                                                                );
                                                            }
                                                            // Never projected (see `buildDataViewerExtraProjection`), so the cell
                                                            // says what the column is rather than printing an empty string that
                                                            // would read as a missing value.
                                                            if (column.kind === 'binary') {
                                                                return (
                                                                    <td key={column.key} className="mono">
                                                                        <span className="raw-cell-muted">&lt;binary&gt;</span>
                                                                    </td>
                                                                );
                                                            }

                                                            const text = column.kind === 'datetime' ? formatDataViewerTime(raw, timeFormat, timeZone) : String(raw ?? '');
                                                            // What opening this cell would give that the row cannot: a document to
                                                            // walk, or text that does not fit. A JSON cell holding something that
                                                            // did not parse is not a document and has no tree to offer.
                                                            const action = isNull
                                                                ? undefined
                                                                : column.kind === 'json'
                                                                  ? jsonDocumentCells.has(`${index}:${column.key}`)
                                                                      ? 'json'
                                                                      : undefined
                                                                  : column.kind === 'text' && isExpandableTextCell(text)
                                                                    ? 'text'
                                                                    : undefined;

                                                            const cellKey = `${index}:${column.key}`;
                                                            return (
                                                                <td key={column.key} className={`mono${column.kind === 'number' ? ' is-numeric' : ''}${action ? ' has-cell-action' : ''}`}>
                                                                    {isNull ? <span className="is-null">NULL</span> : text}
                                                                    {/* Pinned to the head of the cell, not its tail. A column that
                                                                        shows a whole payload is wider than the viewport, so a
                                                                        control at the far end is off screen exactly when the value
                                                                        is long enough to need it. */}
                                                                    {action ? (
                                                                        <span className="raw-cell-actions">
                                                                            <button
                                                                                type="button"
                                                                                className={`raw-cell-action${copiedCell === cellKey ? ' is-copied' : ''}`}
                                                                                // The row is the click target for the inspector, so
                                                                                // a cell control that did not stop here would open it
                                                                                // on top of whatever this button did.
                                                                                onClick={(event) => {
                                                                                    event.stopPropagation();
                                                                                    copyCellValue(cellKey, text);
                                                                                }}
                                                                                onKeyDown={(event) => event.stopPropagation()}
                                                                                title={`Copy ${column.label}`}
                                                                                aria-label={`Copy ${column.label}`}
                                                                            >
                                                                                <MaterialIcon name={copiedCell === cellKey ? 'check' : 'content_copy'} className="icon-sm" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="raw-cell-action"
                                                                                onClick={(event) => {
                                                                                    event.stopPropagation();
                                                                                    if (action === 'json') openJsonKeyPicker(index, column.key);
                                                                                    else openTextCell(index, column.key, column.label);
                                                                                }}
                                                                                onKeyDown={(event) => event.stopPropagation()}
                                                                                title={action === 'json' ? `Explore ${column.label} keys` : `Open ${column.label}`}
                                                                                aria-label={action === 'json' ? `Explore ${column.label} keys` : `Open ${column.label}`}
                                                                            >
                                                                                <MaterialIcon name={action === 'json' ? 'data_object' : 'notes'} className="icon-sm" />
                                                                            </button>
                                                                        </span>
                                                                    ) : null}
                                                                </td>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            />
                                        ) : null}
                                        {rawLoading ? <div className="empty-state">Loading...</div> : null}
                                        {!rawLoading && rows.length === 0 ? <div className="empty-state">No data</div> : null}
                                    </div>
                                    <ResultPagination page={page} pageSize={rawPageSize} rowCount={rows.length} loading={rawLoading} endLoading={endLoading} forceNextPage={Boolean(rawPageRequest?.boundedRange)} rowsPerTag={rawRowsPerTag} onRowsPerTagChange={handleRowsPerTagChange} onPage={moveRawPage} onEndPage={handleEndPage} />
                                </div>
                            ) : null}
                            {queryInputsReady && mode === 'chart' ? (
                                <div className="data-viewer-chart-stack">
                                    {chartError ? <div className="error-box">{chartError}</div> : null}
                                    {/* An overlay, not a replacement. Swapping the panels out for a
                                        "Loading..." block unmounts every ECharts instance under it and
                                        mounts a fresh one when it comes back, so a load the user did not
                                        ask about (a tag toggled, a range applied) reads as the whole chart
                                        stack blinking. The raw grid already resolves this the same way —
                                        it keeps the table and lays the notice over it. */}
                                    {chartLoading ? (
                                        <div className="data-viewer-chart-loading-overlay" aria-live="polite">
                                            Loading...
                                        </div>
                                    ) : null}
                                    {chartGroups.map((group) => {
                                        const chartData = chartResults[group.id] || { series: [], range: group.range as DataViewerTimeRange };
                                        const globalTimeUpdate = buildDataViewerGlobalTimeUpdate({
                                            sourceGroupId: group.id,
                                            chartGroups,
                                            chartViewRanges,
                                            chartNavigatorRanges,
                                            chartResults,
                                            baseKind,
                                        });
                                        const chartMenuOpen = openChartMenuId === group.id;
                                        return (
                                            <div
                                                key={group.id}
                                                className={`table-card data-viewer-chart-card ${group.split ? 'is-split' : 'is-main'}`}
                                                // The split panel's border and header tint, handed to CSS as the tag's own
                                                // series colour. Only the first tag names the panel — a split panel holds
                                                // exactly one — and `undefined` is left unset rather than written as a
                                                // value, so the stylesheet's `var(--split-accent, var(--color-primary))`
                                                // falls back instead of resolving to an empty custom property.
                                                style={group.split ? ({ '--split-accent': seriesColors[group.tagNames[0]] } as React.CSSProperties) : undefined}
                                            >
                                                <div className="data-viewer-chart-panel-header">
                                                    <div className="data-viewer-chart-panel-title">
                                                        <MaterialIcon name={group.split ? 'call_split' : 'query_stats'} className="icon-sm text-primary" />
                                                        <span className="truncate">{group.title}</span>
                                                        <span className="badge badge-muted">{group.tagNames.length}</span>
                                                    </div>
                                                    {!group.split && group.tagNames.length > 0 && (group.tagNames.length > 1 || splitChartGroups.length > 0) ? (
                                                        <div
                                                            className="data-viewer-chart-tag-actions"
                                                            aria-label="Split individual tags"
                                                            onWheel={(event) => {
                                                                const target = event.currentTarget;
                                                                if (target.scrollWidth <= target.clientWidth) return;

                                                                event.preventDefault();
                                                                target.scrollLeft += event.deltaX || event.deltaY;
                                                            }}
                                                        >
                                                            {group.tagNames.map((tagName) => {
                                                                const splitGroup = splitChartGroups.find((item) => (item.tagNames || []).includes(tagName));
                                                                const split = Boolean(splitGroup);
                                                                return (
                                                                    <button
                                                                        key={tagName}
                                                                        type="button"
                                                                        className={`data-viewer-chart-tag-chip${split ? ' is-split' : ''}`}
                                                                        title={split ? `Remove split ${tagName}` : `Split ${tagName}`}
                                                                        onClick={() => handleToggleSplitChart(tagName)}
                                                                    >
                                                                        <span className="truncate">{tagName}</span>
                                                                        <MaterialIcon name={split ? 'close' : 'call_split'} className="icon-sm" />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}
                                                    <div className="data-viewer-chart-panel-actions">
                                                        <div className="data-viewer-chart-action-menu">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-ghost btn-icon data-viewer-chart-menu-button"
                                                                title="Chart actions"
                                                                aria-label="Chart actions"
                                                                aria-haspopup="menu"
                                                                aria-expanded={chartMenuOpen}
                                                                onClick={() => setOpenChartMenuId((current) => (current === group.id ? null : group.id))}
                                                            >
                                                                <MaterialIcon name="more_vert" className="icon-sm" />
                                                            </button>
                                                            {chartMenuOpen ? (
                                                                <div className="data-viewer-chart-menu" role="menu">
                                                                    <button
                                                                        type="button"
                                                                        className="data-viewer-chart-menu-item"
                                                                        role="menuitem"
                                                                        disabled={!canChart}
                                                                        title={!canChart ? NO_NUMERIC_COLUMN_BLOCK_REASON : undefined}
                                                                        aria-label={!canChart ? `Tag Analyzer — ${NO_NUMERIC_COLUMN_BLOCK_REASON}` : undefined}
                                                                        onClick={() => {
                                                                            setOpenChartMenuId(null);
                                                                            handleOpenTagAnalyzer(group, chartData);
                                                                        }}
                                                                    >
                                                                        <MaterialIcon name="monitoring" className="icon-sm" />
                                                                        <span>Tag Analyzer</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="data-viewer-chart-menu-item"
                                                                        role="menuitem"
                                                                        disabled={!globalTimeUpdate}
                                                                        onClick={() => {
                                                                            setOpenChartMenuId(null);
                                                                            handleSetGlobalTime(group.id);
                                                                        }}
                                                                    >
                                                                        {/* The item copies this panel's window onto every other panel —
                                                                            of whatever the base axis actually is. On a distance table
                                                                            there is no time in it to make global, and a clock face over
                                                                            a menu item that moves odometer readings is the same misread
                                                                            `formatDataViewerBaseValue` exists to prevent. `straighten`
                                                                            is the icon the distance range editor already carries. */}
                                                                        <MaterialIcon name={baseKind === 'distance' ? 'straighten' : 'schedule'} className="icon-sm" />
                                                                        <span>{baseKind === 'distance' ? 'Global Distance' : 'Global Time'}</span>
                                                                    </button>
                                                                    {group.split ? (
                                                                        <button
                                                                            type="button"
                                                                            className="data-viewer-chart-menu-item"
                                                                            role="menuitem"
                                                                            onClick={() => {
                                                                                setOpenChartMenuId(null);
                                                                                setRangeEditor({ type: 'split', groupId: group.id });
                                                                            }}
                                                                        >
                                                                            <MaterialIcon name="calendar_month" className="icon-sm" />
                                                                            <span>Time Range</span>
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        {group.split ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-ghost btn-icon data-viewer-chart-close-button"
                                                                title="Remove split chart"
                                                                aria-label="Remove split chart"
                                                                onClick={() => handleRemoveSplitChart(group.id)}
                                                            >
                                                                <MaterialIcon name="close" className="icon-sm" />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="table-card-body">
                                                    <TagEChart
                                                        series={chartData.series}
                                                        timeFormat={timeFormat}
                                                        timeZone={timeZone}
                                                        timeRange={chartData.range}
                                                        displayRange={chartViewRanges[group.id]}
                                                        baseKind={baseKind}
                                                        seriesColors={seriesColors}
                                                        pending={chartRowsPending}
                                                        onDisplayRangeChange={(nextRange, nextNavigatorRange) => {
                                                            setChartViewRanges((current) => ({
                                                                ...current,
                                                                [group.id]: nextRange,
                                                            }));
                                                            if (nextNavigatorRange) {
                                                                setChartNavigatorRanges((current) => ({
                                                                    ...current,
                                                                    [group.id]: nextNavigatorRange,
                                                                }));
                                                            }
                                                        }}
                                                        onShiftMainRange={(direction, currentRange, navigatorRange) => handleShiftMainRange(group, direction, currentRange, navigatorRange)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </section>
                    </div>
                </div>
            </main>

            {/* The row inspector. It moves between rows itself, so the page hands it an index and
                the row list rather than a snapshot of one row. */}
            {rowDetailIndex !== null && rows[rowDetailIndex] ? (
                <RawRowDetailModal
                    subtitle={tableName}
                    position={`row ${rowDetailIndex + 1} of ${rows.length}`}
                    title={String(rows[rowDetailIndex].name ?? '')}
                    fields={rawColumns.map((column) => ({
                        key: column.key,
                        label: column.label,
                        // The type the table declares for this column, written under its name — the
                        // one thing about a value the value itself does not say. The spec already
                        // carries it: the query aliases columns (`… as time, … as value`), so a
                        // lookup keyed on the alias finds nothing on a table with its own names.
                        typeLabel: dataViewerColumnTypeLabel(columnSpecByKey.get(column.key)?.type),
                        // Same question the grid cell asks, asked once more against the same row —
                        // so the two routes into a value can never disagree about whether there is
                        // one. A JSON cell that did not parse has no summary and offers nothing.
                        action:
                            column.kind === 'json'
                                ? isJsonKeyDocument(rows[rowDetailIndex]?.[column.key])
                                    ? ('json' as const)
                                    : undefined
                                : column.kind === 'text' && isExpandableTextCell(String(rows[rowDetailIndex]?.[column.key] ?? ''))
                                  ? ('text' as const)
                                  : undefined,
                        value:
                            column.key === 'time'
                                ? formatBaseValue(rows[rowDetailIndex]?.time)
                                : column.kind === 'datetime'
                                  ? formatDataViewerTime(rows[rowDetailIndex]?.[column.key], timeFormat, timeZone)
                                  : rows[rowDetailIndex]?.[column.key],
                    }))}
                    onOpenField={(key, action) => {
                        if (action === 'json') openJsonKeyPicker(rowDetailIndex, key);
                        else openTextCell(rowDetailIndex, key, rawColumns.find((column) => column.key === key)?.label || key);
                    }}
                    hasPrevious={rowDetailIndex > 0}
                    hasNext={rowDetailIndex < rows.length - 1}
                    onPrevious={() => setRowDetailIndex((current) => Math.max(0, (current ?? 0) - 1))}
                    onNext={() => setRowDetailIndex((current) => Math.min(rows.length - 1, (current ?? 0) + 1))}
                    onClose={() => setRowDetailIndex(null)}
                />
            ) : null}

            {/* The picker is built from the row that was opened, and the detail from what was picked
                there. Nothing about a JSON key outlives these modals — but the picker's selection
                outlives the picker, so "Back to keys" returns to the tree as it was left rather
                than to an empty one. The picker stays in state while the detail is up, and is
                simply not rendered; closing the detail is what ends both. */}
            {jsonKeyPicker && !jsonKeyDetail ? (
                <JsonKeyPickerModal
                    tagName={jsonKeyPicker.tagName}
                    baseLabel={jsonKeyPicker.baseLabel}
                    document={jsonKeyPicker.document}
                    valueColumn={jsonKeyPicker.columnName}
                    initialSelected={jsonKeyPicker.selected}
                    initialView={jsonKeyPickerViewRef.current}
                    onViewChange={(view) => {
                        jsonKeyPickerViewRef.current = view;
                    }}
                    onClose={() => setJsonKeyPicker(null)}
                    onConfirm={(paths) => {
                        setJsonKeyPicker((current) => (current ? { ...current, selected: paths } : current));
                        setJsonKeyDetail({ tagName: jsonKeyPicker.tagName, columnName: jsonKeyPicker.columnName, paths });
                    }}
                />
            ) : null}

            {jsonKeyDetail ? (
                <JsonKeyDetailModal
                    dbName={dbName}
                    userName={userName}
                    tableName={tableName}
                    tagName={jsonKeyDetail.tagName}
                    paths={jsonKeyDetail.paths}
                    from={activeWindow?.from}
                    to={activeWindow?.to}
                    tagColumn={tagColumn}
                    timeColumn={timeColumn}
                    valueColumn={jsonKeyDetail.columnName}
                    baseKind={baseKind}
                    baseLabel={baseColumn}
                    formatBase={formatBaseValue}
                    timeFormat={timeFormat}
                    timeZone={timeZone}
                    onBack={jsonKeyPicker ? () => setJsonKeyDetail(null) : undefined}
                    // Straight to the board, and this page's dialogs close behind it — the tab has
                    // already changed, so leaving them up would put a modal over a board that has
                    // nothing to do with them.
                    onOpenTagAnalyzer={(paths, window) => {
                        // Only on the way out. A refused handoff used to tear both modals down
                        // anyway, so a rejected payload cost the whole selection with no way back to
                        // it — the error text landed on a page the user had been pulled away from.
                        if (!handleOpenTagAnalyzerJsonKeys(jsonKeyDetail.tagName, jsonKeyDetail.columnName, paths, window)) return;
                        closeRowDialogs();
                    }}
                    onClose={() => {
                        setJsonKeyDetail(null);
                        setJsonKeyPicker(null);
                    }}
                />
            ) : null}

            {/* A cell's text at full size. Layered over the inspector rather than replacing it: the
                reader may have opened it from a field there, and closing this should put them back
                where they were rather than on the grid. */}
            {textCell && rows[textCell.index] ? (
                <TextValueModal
                    title={textCell.label}
                    subtitle={`${String(rows[textCell.index].name ?? '')} · ${formatBaseValue(rows[textCell.index].time)}`}
                    value={rows[textCell.index][textCell.key]}
                    onClose={() => setTextCell(null)}
                />
            ) : null}

            {/* ─── distance-base seam (mount point) ─────────────────────────────────────────────
                The ONE place the page picks a range editor. Both editors take the same three core
                props — a range in, an applied range out, a close — and the distance one additionally
                takes the slider extent, which is exactly `DistanceRangeTab`'s `pBounds`. So when
                `DistanceRangeTab` / `TimeRangeModal`'s `pLockTab` land on this branch, this whole
                conditional collapses back to a single `<TimeRangeModal ... pLockTab={baseKind}
                pBounds={distanceBounds} />` and `DistanceRangeModal` (defined near the top of this
                file) is deleted. `distanceBounds` and its loader effect stay — the shared tab needs
                the same extent from the same query. Nothing else in the page moves.
                ─────────────────────────────────────────────────────────────────────────────── */}
            {rangeEditor ? (
                baseKind === 'distance' ? (
                    <DistanceRangeModal range={rangeEditorRange} bounds={distanceBounds} onClose={() => setRangeEditor(null)} onApply={handleRangeApply} />
                ) : (
                    <TimeRangeModal range={rangeEditorRange} onClose={() => setRangeEditor(null)} onApply={handleRangeApply} />
                )
            ) : null}
            {formatOpen ? (
                <FormatTimezoneModal
                    timeFormat={timeFormat}
                    timeZone={timeZone}
                    onClose={() => setFormatOpen(false)}
                    onApply={(next) => {
                        setTimeFormat(next.timeFormat);
                        setTimeZone(next.timeZone);
                        setFormatOpen(false);
                    }}
                />
            ) : null}
        </div>
    );
}
