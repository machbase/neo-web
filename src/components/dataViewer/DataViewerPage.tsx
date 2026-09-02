import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as echarts from 'echarts';
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
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
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
import {
    DEFAULT_DATA_VIEWER_ROWS_PER_TAG,
    DEFAULT_TIME_FORMAT,
    DEFAULT_TIME_ZONE,
    buildAssetTreeRows,
    buildDataViewerChartGroups,
    buildDataViewerChartResultsFromRawRows,
    buildDataViewerEChartOption,
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
    buildDataViewerDragRangeUpdate,
    buildDataViewerTagSelectionUpdate,
    buildDataViewerWheelZoomRange,
    buildDataViewerZoomControlRange,
    buildRawColumnWidths,
    buildRawResultColumns,
    buildRawRowNameColors,
    buildSeriesColorMap,
    extractDataViewerDataZoomRange,
    formatDataViewerTimeRangeInput,
    formatDataViewerNavigatorRangeLabels,
    filterDataViewerTags,
    filterVisibleAssetRows,
    formatDataViewerBaseRangeLabel,
    formatDataViewerBaseValue,
    formatDataViewerChartRangeEdge,
    formatDataViewerDistance,
    getDataViewerChartRangeMs,
    getDataViewerBaseAxisLabel,
    getDataViewerDefaultRange,
    getDataViewerRawPageSize,
    getTimeFormatLabel,
    getTimeZoneLabel,
    hasDataViewerRawNextPage,
    hasExplicitDataViewerDataZoomEventRange,
    isDataViewerJsonValueColumn,
    isDataViewerRangeReversed,
    isSameDataViewerChartRange,
    normalizeSelectedTagNames,
    resolveDataViewerBaseColumn,
    resolveDataViewerBaseColumnType,
    resolveDataViewerBaseKind,
    resolveTimeRangeInput,
    toDataViewerDate,
} from './dataViewerModel';
import type { DataViewerBaseKind } from './dataViewerModel';
import { isDistanceAnchorEdge, resolveDistanceEdge } from '@/utils/distanceRange';
import './DataViewerPage.scss';

type ResultRow = Record<string, unknown>;
type DataViewerTimeRange = { from?: string | number; to?: string | number; start?: string | number; end?: string | number; startTime?: number; endTime?: number };
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
const JSON_VALUE_COLUMN_BLOCK_REASON = 'Unavailable: the value column of this table is a JSON type, which cannot be charted or analyzed.';

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

// ─── range editor ─────────────────────────────────────────────────────────────────────────────
// One editor for both axes, and it is the dashboard's — `components/modal/TimeRangeModal`, pinned
// to this page's axis with `pLockTab`. The time half already went through it; the distance half
// used to be a second implementation living here, ~460 lines of slider, ticks and quick windows
// that computed every value from `@/utils/distanceRange` exactly as the shared tab does. The only
// thing keeping them apart was where the extent came from: the shared modal read it off a dashboard
// block, which this page does not have. `pBounds` closes that gap, so the duplicate is gone and a
// drag now lands on the same number in both screens by construction rather than by agreement.
function RangeEditorModal({
    range,
    baseKind,
    bounds,
    onApply,
    onClose,
}: {
    range: DataViewerTimeRange;
    baseKind: DataViewerBaseKind;
    /** The base column's real extent, or `null` when it could not be read — the slider then hides. */
    bounds?: { min: number; max: number } | null;
    onApply: (range: DataViewerTimeRange) => void;
    onClose: () => void;
}) {
    const distance = baseKind === 'distance';
    return (
        <NeoTimeRangeModal
            pSetTimeRangeModal={(open) => {
                if (!open) onClose();
            }}
            // A distance edge is a number or an anchor expression and is handed over as written; a
            // time edge goes through the page's own input formatting first.
            pStartTime={distance ? (range.from as string | number) : formatDataViewerTimeRangeInput(range.from)}
            pEndTime={distance ? (range.to as string | number) : formatDataViewerTimeRangeInput(range.to)}
            pSetTime={() => undefined}
            pSaveCallback={(from, to) => onApply({ from: from ?? '', to: to ?? '' })}
            pLockTab={distance ? 'distance' : 'time'}
            pBounds={distance ? bounds : undefined}
        />
    );
}


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

function TagEChart({
    series,
    timeFormat,
    timeZone,
    timeRange,
    displayRange,
    baseKind = 'time',
    seriesColors,
    pending = false,
    onDisplayRangeChange,
    onShiftMainRange,
}: {
    series: Array<{ name: string; data: Array<[number, number | null]> }>;
    timeFormat: string;
    timeZone: string;
    timeRange: DataViewerTimeRange;
    displayRange?: DataViewerTimeRange;
    baseKind?: DataViewerBaseKind;
    seriesColors?: Record<string, string>;
    /**
     * The rows this panel would be drawn from have not arrived yet.
     *
     * Only the empty state reads it, and only to stay silent: "no data" and "not here yet" look
     * identical from inside the chart — both are an empty `series` — and announcing the first while
     * the second is true is the flicker the page's `chartRowsPending` exists to remove. The series
     * is still drawn while this is true, because during a transition it is the *previous* window's
     * series and holding it is the point.
     */
    pending?: boolean;
    onDisplayRangeChange?: (range: DataViewerTimeRange, navigatorRange?: DataViewerTimeRange) => void;
    onShiftMainRange?: (direction: 'backward' | 'forward', currentRange: any, navigatorRange: any) => void;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);
    // `baseKind` rides in the ref alongside the ranges because the interaction effect below is
    // installed once (on mount) and every emitted edge has to be written in the axis's own units —
    // a captured value would keep emitting ISO strings after a distance table loaded.
    const rangeRef = useRef({ currentRange: {}, navigatorRange: {}, onDisplayRangeChange, baseKind });
    const dragStateRef = useRef<{
        mode: 'zoom-in' | 'pan' | 'zoom-out';
        startTime: number;
        startX: number;
        containerLeft: number;
        currentRange: any;
        navigatorRange: any;
        onDisplayRangeChange?: (range: DataViewerTimeRange, navigatorRange?: DataViewerTimeRange) => void;
        gridBounds: { top: number; height: number };
        // The plot's own left/right edge in container pixels, read once when the gesture starts. The
        // guide is drawn against these so it stops at the axis rather than following the cursor off
        // into the legend, the navigator and the page beyond.
        plotBounds?: { left: number; right: number };
    } | null>(null);
    const [dragPreview, setDragPreview] = useState<{ mode: 'zoom-in' | 'zoom-out'; left: number; width: number; top: number; height: number } | null>(null);
    const allPoints = useMemo(() => series.flatMap((item) => item.data), [series]);
    const hasChartData = allPoints.length > 0;
    const options = useMemo(
        () => buildDataViewerEChartOption({ series, timeFormat, timeZone, timeRange, displayRange, baseKind, seriesColors }),
        [baseKind, displayRange, series, seriesColors, timeFormat, timeRange, timeZone],
    );
    const currentRange = useMemo(() => getDataViewerChartRangeMs(allPoints, displayRange || timeRange, baseKind), [allPoints, baseKind, displayRange, timeRange]);
    const navigatorRange = useMemo(() => getDataViewerChartRangeMs(allPoints, timeRange, baseKind), [allPoints, baseKind, timeRange]);

    useEffect(() => {
        rangeRef.current = { currentRange, navigatorRange, onDisplayRangeChange, baseKind };
    }, [baseKind, currentRange, navigatorRange, onDisplayRangeChange]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const chart = echarts.init(container, null, { renderer: 'canvas' });
        chartRef.current = chart;
        const getDataZoomEventState = (params: any = {}) => {
            const eventState = Array.isArray(params.batch) ? params.batch[0] : params;
            const dataZoomOptions = (chart.getOption?.()?.dataZoom || []) as any[];
            const dataZoomIndex = Number(eventState?.dataZoomIndex);
            const dataZoomId = eventState?.dataZoomId;
            const optionState = dataZoomId ? dataZoomOptions.find((item) => item?.id === dataZoomId) : Number.isFinite(dataZoomIndex) ? dataZoomOptions[dataZoomIndex] : undefined;
            return {
                ...(optionState || dataZoomOptions[1] || dataZoomOptions[0] || {}),
                ...(eventState || {}),
            };
        };
        // `outside: 'clamp'` is what makes a drag survive leaving the plot. A gesture that starts on
        // the chart and ends over the tag list is still a gesture the user finished deliberately, and
        // ECharts extrapolates happily past the axis — so the pixel converts to a real value, it is
        // simply one the axis does not show. Pinning it to the visible edge is the range the guide
        // was already drawing, which is the one the user was aiming at.
        //
        // `outside: 'reject'` (the default) stays on the *entry* points — mousedown and the wheel.
        // A press that lands on the legend or the navigator is not a main-plot gesture at all, and
        // accepting it there would start a zoom from a coordinate nothing on screen points at.
        const convertMouseEventToTimestamp = (event: MouseEvent | WheelEvent, outside: 'reject' | 'clamp' = 'reject') => {
            const rect = container.getBoundingClientRect?.();
            if (!rect) return undefined;
            const pixel = [event.clientX - rect.left, event.clientY - rect.top];
            const inside = Boolean(chart.containPixel?.({ gridIndex: 0 }, pixel));
            if (!inside && outside === 'reject') return undefined;
            const fromAxis = chart.convertFromPixel?.({ xAxisIndex: 0 }, pixel);
            const fromGrid = chart.convertFromPixel?.({ gridIndex: 0 }, pixel);
            const axisTime = Array.isArray(fromAxis) ? Number(fromAxis[0]) : Number(fromAxis);
            const gridTime = Array.isArray(fromGrid) ? Number(fromGrid[0]) : Number(fromGrid);
            const { currentRange: activeRange } = rangeRef.current as any;
            const start = Number(activeRange?.startTime);
            const end = Number(activeRange?.endTime);
            const converted = Number.isFinite(axisTime)
                ? axisTime
                : Number.isFinite(gridTime)
                  ? gridTime
                  : Number.isFinite(start) && Number.isFinite(end)
                    ? start + (end - start) / 2
                    : undefined;
            if (converted === undefined || inside) return converted;
            // Outside: clamp onto the window the axis is currently showing. `currentRange` is the
            // same pair `buildDataViewerEChartOption` writes into `xAxis.min/max`, so its two edges
            // *are* the plot's two edges, said in the axis's units rather than in pixels.
            if (!Number.isFinite(start) || !Number.isFinite(end)) return converted;
            return Math.min(Math.max(converted, Math.min(start, end)), Math.max(start, end));
        };
        // The plot's horizontal extent in container pixels. `convertToPixel` on the main x axis is
        // the only honest source for it: the option says `left: 35, right: 35` but `containLabel`
        // then insets the left edge by however wide the y-axis labels came out, so anything derived
        // from the option alone would put the boundary in the wrong place on exactly the tables
        // whose values are widest.
        const getPlotXBounds = () => {
            const { currentRange: activeRange } = rangeRef.current as any;
            // `convertToPixel`'s published signature takes a string or an array; a bare number on a
            // single-axis finder is what ECharts actually accepts (and what returns the axis's own
            // pixel), so the cast is the type definition being narrower than the runtime.
            const toPixel = (value: unknown) => Number((chart.convertToPixel as any)?.({ xAxisIndex: 0 }, Number(value)));
            const left = toPixel(activeRange?.startTime);
            const right = toPixel(activeRange?.endTime);
            if (!Number.isFinite(left) || !Number.isFinite(right)) return undefined;
            return { left: Math.min(left, right), right: Math.max(left, right) };
        };
        // The axis hands back coordinates; the page stores range edges. On a distance axis those are
        // numbers, so the conversion goes through one helper rather than four inline `new Date(...)`
        // calls that would each have to be remembered.
        const toRangeEdge = (value: unknown) => formatDataViewerChartRangeEdge(value, (rangeRef.current as any).baseKind);
        const handleMouseWheelZoom = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            const { currentRange: activeRange, navigatorRange: activeNavigatorRange, onDisplayRangeChange: activeRangeChange } = rangeRef.current as any;
            const anchorTime = convertMouseEventToTimestamp(event);
            const nextRange = buildDataViewerWheelZoomRange(event.deltaY, anchorTime, activeRange, activeNavigatorRange);
            if (!nextRange || isSameDataViewerChartRange(nextRange, activeRange)) return;
            event.preventDefault();
            event.stopPropagation();
            activeRangeChange?.(
                { from: toRangeEdge(nextRange.startTime), to: toRangeEdge(nextRange.endTime) },
                { from: toRangeEdge(activeNavigatorRange.startTime), to: toRangeEdge(activeNavigatorRange.endTime) },
            );
        };
        const getDragMode = (button: number) => {
            if (button === 0) return 'zoom-in';
            if (button === 1) return 'pan';
            if (button === 2) return 'zoom-out';
            return undefined;
        };
        const getMainGridBounds = () => {
            const grid = ((chart.getOption?.()?.grid as any[]) || [])[0] || {};
            const top = Number(grid.top);
            const height = Number(grid.height);
            return {
                top: Number.isFinite(top) ? top : 40,
                height: Number.isFinite(height) ? height : 178,
            };
        };
        const emitDragRange = (dragState: NonNullable<typeof dragStateRef.current>, endTime: number) => {
            const nextRange = buildDataViewerDragRangeUpdate({
                mode: dragState.mode,
                dragStartTime: dragState.startTime,
                dragEndTime: endTime,
                currentRange: dragState.currentRange,
                navigatorRange: dragState.navigatorRange,
            });
            if (!nextRange || isSameDataViewerChartRange(nextRange, dragState.currentRange)) return;

            dragState.onDisplayRangeChange?.(
                { from: toRangeEdge(nextRange.startTime), to: toRangeEdge(nextRange.endTime) },
                { from: toRangeEdge(dragState.navigatorRange.startTime), to: toRangeEdge(dragState.navigatorRange.endTime) },
            );
        };
        const applyDragRange = (event: MouseEvent) => {
            const dragState = dragStateRef.current;
            dragStateRef.current = null;
            setDragPreview(null);
            if (!dragState) return;

            // Released outside the plot still counts, clamped to the edge it left through. Rejecting
            // it — which is what happens when the conversion refuses a pixel it does not contain —
            // threw the whole gesture away, so a drag that overshot by two pixels selected nothing
            // and the user had to start again with no explanation.
            const endTime = convertMouseEventToTimestamp(event, 'clamp');
            if (!Number.isFinite(endTime) || Math.abs(event.clientX - dragState.startX) < 8) return;

            emitDragRange(dragState, Number(endTime));
        };
        // Container-relative x, held inside the plot. The guide is the promise the release keeps, so
        // the two clamp against the same boundary: what the rectangle covers when the pointer is out
        // in the tag list is exactly the range that lands when the button comes up there.
        const toPlotX = (clientX: number, dragState: NonNullable<typeof dragStateRef.current>) => {
            const x = clientX - dragState.containerLeft;
            const bounds = dragState.plotBounds;
            return bounds ? Math.min(Math.max(x, bounds.left), bounds.right) : x;
        };
        const handleDragMove = (event: MouseEvent) => {
            const dragState = dragStateRef.current;
            if (!dragState) return;
            event.preventDefault();
            event.stopPropagation();

            const endTime = convertMouseEventToTimestamp(event, 'clamp');
            if (dragState.mode === 'pan') {
                if (Number.isFinite(endTime) && Math.abs(event.clientX - dragState.startX) >= 1) {
                    emitDragRange(dragState, Number(endTime));
                }
                return;
            }
            const startX = toPlotX(dragState.startX, dragState);
            const currentX = toPlotX(event.clientX, dragState);
            setDragPreview({ mode: dragState.mode, left: Math.min(startX, currentX), width: Math.abs(currentX - startX), ...dragState.gridBounds });
        };
        const handleDragEnd = (event: MouseEvent) => {
            if (!dragStateRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            window.removeEventListener('mousemove', handleDragMove, true);
            window.removeEventListener('mouseup', handleDragEnd, true);
            applyDragRange(event);
        };
        const handleMouseDownDrag = (event: MouseEvent) => {
            const mode = getDragMode(event.button);
            if (!mode) return;
            const startTime = convertMouseEventToTimestamp(event);
            if (!Number.isFinite(startTime)) return;
            const numericStartTime = Number(startTime);

            const rect = container.getBoundingClientRect?.();
            if (!rect) return;
            event.preventDefault();
            event.stopPropagation();

            const { currentRange: activeRange, navigatorRange: activeNavigatorRange, onDisplayRangeChange: activeRangeChange } = rangeRef.current as any;
            dragStateRef.current = {
                mode,
                startTime: numericStartTime,
                startX: event.clientX,
                containerLeft: rect.left,
                currentRange: activeRange,
                navigatorRange: activeNavigatorRange,
                onDisplayRangeChange: activeRangeChange,
                gridBounds: getMainGridBounds(),
                plotBounds: getPlotXBounds(),
            };
            setDragPreview(mode === 'pan' ? null : { mode, left: toPlotX(event.clientX, dragStateRef.current), width: 0, ...dragStateRef.current.gridBounds });
            window.addEventListener('mousemove', handleDragMove, true);
            window.addEventListener('mouseup', handleDragEnd, true);
        };
        const handleContextMenu = (event: MouseEvent) => {
            const startTime = convertMouseEventToTimestamp(event);
            if (!Number.isFinite(startTime)) return;
            event.preventDefault();
        };
        const handleDataZoom = (params: any) => {
            const { currentRange: activeRange, navigatorRange: activeNavigatorRange, onDisplayRangeChange: activeRangeChange } = rangeRef.current as any;
            const dataZoomState = getDataZoomEventState(params);
            const nextRange = hasExplicitDataViewerDataZoomEventRange(params)
                ? extractDataViewerDataZoomRange(params, activeRange, activeNavigatorRange)
                : extractDataViewerDataZoomRange(dataZoomState, activeRange, activeNavigatorRange);
            if (!nextRange || isSameDataViewerChartRange(nextRange, activeRange)) return;
            activeRangeChange?.(
                { from: toRangeEdge(nextRange.startTime), to: toRangeEdge(nextRange.endTime) },
                { from: toRangeEdge(activeNavigatorRange.startTime), to: toRangeEdge(activeNavigatorRange.endTime) },
            );
        };
        chart.on('datazoom', handleDataZoom);
        container.addEventListener('wheel', handleMouseWheelZoom, { passive: false, capture: true });
        container.addEventListener('mousedown', handleMouseDownDrag, { capture: true });
        container.addEventListener('contextmenu', handleContextMenu, { capture: true });

        const resize = () => chart.resize();
        let observer: ResizeObserver | undefined;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(resize);
            observer.observe(container);
        } else {
            window.addEventListener('resize', resize);
        }
        resize();

        return () => {
            chart.off('datazoom', handleDataZoom);
            container.removeEventListener('wheel', handleMouseWheelZoom, true);
            container.removeEventListener('mousedown', handleMouseDownDrag, true);
            container.removeEventListener('contextmenu', handleContextMenu, true);
            window.removeEventListener('mousemove', handleDragMove, true);
            window.removeEventListener('mouseup', handleDragEnd, true);
            if (observer) observer.disconnect();
            else window.removeEventListener('resize', resize);
            chart.dispose();
            chartRef.current = null;
            dragStateRef.current = null;
        };
        // Mount-once, deliberately. This used to depend on `hasChartData`, from a version of the
        // component that *early-returned* `<div>No chart data</div>` — the container really was
        // unmounted then, so the instance had to be rebuilt when it came back. The empty state is an
        // overlay now (`data-viewer-chart-empty-overlay`) and the container never leaves the tree, so
        // the dependency's only remaining effect was to `dispose()` and `echarts.init()` again every
        // time the series went empty and refilled. Changing tags does exactly that — the rows blank
        // while the window re-resolves — so the canvas was torn down and rebuilt twice per tag
        // change. That is the blink: the axis never moves, the *canvas* disappears. Nothing inside
        // reads props; the handlers all go through `rangeRef`, which is why this can be `[]` at all.
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.setOption(options as any, true);
        if (Number.isFinite(currentRange.startTime) && Number.isFinite(currentRange.endTime)) {
            chartRef.current.dispatchAction?.({ type: 'dataZoom', dataZoomId: 'panel-inside-data-zoom', startValue: currentRange.startTime, endValue: currentRange.endTime });
            chartRef.current.dispatchAction?.({ type: 'dataZoom', dataZoomId: 'panel-slider-data-zoom', startValue: currentRange.startTime, endValue: currentRange.endTime });
        }
        chartRef.current.resize();
    }, [currentRange, options]);

    const applyZoomControl = useCallback(
        (action: string, zoom?: number) => {
            const nextRange = buildDataViewerZoomControlRange(action, currentRange, navigatorRange, zoom);
            if (!nextRange || isSameDataViewerChartRange(nextRange, currentRange)) return;
            const navigatorStart = Number(navigatorRange.startTime);
            const navigatorEnd = Number(navigatorRange.endTime);
            onDisplayRangeChange?.(
                { from: formatDataViewerChartRangeEdge(nextRange.startTime, baseKind), to: formatDataViewerChartRangeEdge(nextRange.endTime, baseKind) },
                Number.isFinite(navigatorStart) && Number.isFinite(navigatorEnd)
                    ? { from: formatDataViewerChartRangeEdge(navigatorStart, baseKind), to: formatDataViewerChartRangeEdge(navigatorEnd, baseKind) }
                    : undefined,
            );
        },
        [baseKind, currentRange, navigatorRange, onDisplayRangeChange],
    );

    const zoomControlsDisabled =
        !Number.isFinite(currentRange.startTime) || !Number.isFinite(currentRange.endTime) || !Number.isFinite(navigatorRange.startTime) || !Number.isFinite(navigatorRange.endTime);
    const navigatorLabels = useMemo(
        () => formatDataViewerNavigatorRangeLabels(navigatorRange, timeFormat, timeZone, baseKind),
        [baseKind, navigatorRange, timeFormat, timeZone],
    );

    return (
        <div className="data-viewer-chart-shell">
            <button
                type="button"
                className="data-viewer-chart-range-shift data-viewer-chart-range-shift-left"
                title="Move range backward"
                aria-label="Move range backward"
                disabled={zoomControlsDisabled}
                onClick={() => onShiftMainRange?.('backward', currentRange, navigatorRange)}
            >
                <VscChevronLeft size={20} />
            </button>
            <div className="data-viewer-chart-footer-form" aria-label="Chart zoom controls">
                <div className="data-viewer-chart-toolbar-controls">
                    <div className="data-viewer-chart-toolbar-group">
                        {[
                            ['zoom-in', ZoomInFour, 'Zoom in', 0.4],
                            ['zoom-in', ZoomInTwo, 'Zoom in', 0.2],
                            ['focus', undefined, 'Focus', undefined],
                            ['zoom-out', ZoomOutTwo, 'Zoom out', 0.2],
                            ['zoom-out', ZoomOutFour, 'Zoom out', 0.4],
                        ].map(([action, image, label, zoom], index) => (
                            <button
                                key={`${action}-${index}`}
                                type="button"
                                className="data-viewer-chart-toolbar-button"
                                title={String(label)}
                                aria-label={String(label)}
                                disabled={zoomControlsDisabled}
                                onClick={() => applyZoomControl(String(action), zoom as number | undefined)}
                            >
                                {image ? <img src={image as string} alt="" className="data-viewer-chart-toolbar-image" /> : <MaterialIcon name="center_focus_strong" className="data-viewer-chart-toolbar-icon" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div
                ref={containerRef}
                className={`data-viewer-chart${dragStateRef.current?.mode === 'pan' ? ' is-panning' : ''}`}
                data-display-from={Number.isFinite(currentRange.startTime) ? String(Math.floor(Number(currentRange.startTime))) : ''}
                data-display-to={Number.isFinite(currentRange.endTime) ? String(Math.ceil(Number(currentRange.endTime))) : ''}
                data-navigator-from={Number.isFinite(navigatorRange.startTime) ? String(Math.floor(Number(navigatorRange.startTime))) : ''}
                data-navigator-to={Number.isFinite(navigatorRange.endTime) ? String(Math.ceil(Number(navigatorRange.endTime))) : ''}
            />
            {dragPreview ? (
                <div
                    className={`data-viewer-chart-drag-preview data-viewer-chart-drag-preview-${dragPreview.mode}`}
                    style={{
                        left: `${48 + Math.max(0, dragPreview.left)}px`,
                        top: `${dragPreview.top}px`,
                        width: `${dragPreview.width}px`,
                        height: `${dragPreview.height}px`,
                    }}
                />
            ) : null}
            {/* `pending` and not just `hasChartData`: an empty series during a transition is a panel
                waiting for its rows, not a window with nothing in it, and saying "No chart data"
                over it is the blink the user sees. See `chartRowsPending` on the page. */}
            {!hasChartData && !pending ? (
                <div className="data-viewer-chart-empty-overlay" aria-live="polite">
                    No chart data
                </div>
            ) : null}
            {navigatorLabels.start || navigatorLabels.end ? (
                <div className="data-viewer-chart-navigator-labels" aria-label="Mini chart time range">
                    <span title={navigatorLabels.start}>{navigatorLabels.start}</span>
                    <span title={navigatorLabels.end}>{navigatorLabels.end}</span>
                </div>
            ) : null}
            <button
                type="button"
                className="data-viewer-chart-range-shift data-viewer-chart-range-shift-right"
                title="Move range forward"
                aria-label="Move range forward"
                disabled={zoomControlsDisabled}
                onClick={() => onShiftMainRange?.('forward', currentRange, navigatorRange)}
            >
                <VscChevronRight size={20} />
            </button>
        </div>
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
    const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
    const [mode, setMode] = useState<'raw' | 'chart'>('raw');
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
        // would ask a stat view that has no MIN_TIME column to answer with, then fall back to scanning
        // a column that measures metres — and no date parsing happens, so `toDataViewerDate` never
        // gets the chance to turn 999990 into 1970-01-01. The edges are the numbers themselves;
        // `null` means the value was not one.
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
    }, [baseKind, canQuery, frozenWindowKey, range, resolveRangeForTagNames, selectedTagNames]);

    // The distance editor's slider bounds, read when the editor opens rather than with the table:
    // it is the only thing that wants them, and a dialog nobody opens should not have cost a query.
    // Cheap enough to re-read per open — the tag stat view answers the reference table in 197µs for
    // one tag and 1.46ms for ten — and re-reading is what keeps the extent honest after the tag
    // selection changes.
    //
    // Note which column this asks about: `baseColumn`, the BASETIME column the schema read resolved,
    // not `timeColumn`. On a distance table those differ. `baseKind` goes with it because it is what
    // opens the tag stat view's fast path — MIN_DISTANCE/MAX_DISTANCE hold that column's extent, and
    // those columns exist only on a distance base. See `queryTagBaseColumnBounds`.
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
    }, [baseColumn, baseKind, canQuery, dbName, rangeEditor, selectedTagNames, tableName, tagColumn, userName]);

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
    }, [activeWindow, backwardScan, baseKind, canQuery, dbName, page, rawPageRequest, rawPageSize, selectedTagNames, tableName, tagColumn, timeColumn, userName, valueColumn]);

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
    }, [baseKind, canQuery, chartGroups, chartRowsPending, mode, rows, splitChartRows]);

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
    // "Chart mode and a JSON value column never coexist", enforced as an invariant rather than as a
    // second copy of the button's `disabled`. It has to be an invariant because the schema lands
    // strictly after the first paint: whoever is already looking at a chart when the column read
    // comes back JSON has to be moved somewhere, and Raw is the honest destination — it renders the
    // same table without needing the value to be a number. Keeping `mode` in the dependencies makes
    // the rule total, so the button's `disabled` is the affordance and this is the guarantee.
    useEffect(() => {
        if (valueColumnIsJson && mode === 'chart') setMode('raw');
    }, [mode, valueColumnIsJson]);
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
    }, [activeWindow, baseKind, canQuery, dbName, endLoading, page, rawPageBounds, rawPageSize, selectedTagNames, tableName, tagColumn, timeColumn, userName]);
    // `baseKind` only renames the base column's header — the row key stays `time`, which is what the
    // cells, the widths and the page cursors all read. Header and widths share this one array, so
    // they cannot disagree about how wide `Distance` is.
    const rawColumns = useMemo(
        () =>
            buildRawResultColumns(rows, {
                hiddenKeys: assetHierarchy ? [assetHierarchy.column || 'asset'] : [],
                baseKind,
            }),
        [assetHierarchy, baseKind, rows],
    );
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
        [backwardScan, baseKind, canQuery, chartGroups, dbName, rangeEditor, rawRowsPerTag, resolveRangeForTagNames, splitChartRanges, tableName, tagColumn, timeColumn, userName, valueColumn],
    );
    const handleOpenTagAnalyzer = useCallback(
        (
            group: { id: string; title: string; tagNames: string[]; range: { from?: unknown; to?: unknown } },
            chartData?: { range?: DataViewerTimeRange },
        ) => {
            // Tag Analyzer opens a board whose every tag carries `calculationMode: 'avg'` over this
            // same value column. Averaging a JSON document yields nothing, so the board would open
            // empty and blame itself.
            //
            // Today this line cannot fire: the only entry point is the chart panel's action menu,
            // and chart mode is already closed for a JSON value column, so the menu is not on
            // screen to be clicked. It is kept deliberately, and its redundancy is the reason it is
            // one line — the reachability is a property of where the entry point happens to live,
            // not of the rule, and a second entry point (raw's own toolbar, a keyboard shortcut)
            // would make it load-bearing without anyone remembering to add it. Mutation-tested:
            // removing it fails nothing, which is the accurate description of a redundant guard,
            // not of a vacuous test.
            if (valueColumnIsJson) return;
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
                        value: valueColumn,
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
        [baseColumn, baseColumnType, baseKind, chartViewRanges, databaseId, dbName, setBoardList, setSelectedTab, tableName, tagColumn, userName, valueColumn, valueColumnIsJson],
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
        [backwardScan, baseKind, canQuery, dbName, page, rawPageBounds, rawPageSize, rawRowsPerTag, tableName, tagColumn, timeColumn, userName, valueColumn],
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
                                            {/* Not rendered at all on a JSON value column, rather than rendered
                                                disabled: a dead segment still presents Chart as a mode this table
                                                has, and the control reads as broken instead of as a table that
                                                only does Raw. Same call as the format/timezone button on a
                                                distance axis. The mode invariant effect keeps `mode` on 'raw',
                                                so the remaining segment is always the selected one. */}
                                            {valueColumnIsJson ? null : (
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
                                                            // `is-numeric` right-aligns the value column — but only when it holds numbers.
                                                            // A JSON document right-aligned starts at a different x per row, which makes a
                                                            // column of documents unreadable. The header carries it too so the
                                                            // label sits over the digits instead of drifting to the far edge.
                                                            <th key={column.key} className={column.key === 'value' && !valueColumnIsJson ? 'is-numeric' : undefined}>
                                                                {column.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                )}
                                                itemContent={(_index, row) => (
                                                    // Cells only — TableVirtuoso's default TableRow already supplies the `<tr>`.
                                                    <>
                                                        {rawColumns.map((column) => {
                                                            const raw = row[column.key];
                                                            // A NULL reads as `NULL` here for the same reason it does in the SQL
                                                            // result grid: a blank cell is indistinguishable from an empty string.
                                                            // Only the value column can be null — `time` is the BASETIME column and
                                                            // `name` the tag primary key — so `name`'s colour lookup below is safe.
                                                            const isNull = column.key !== 'time' && (raw === null || raw === undefined);
                                                            const value = column.key === 'time' ? formatBaseValue(raw) : String(raw ?? '');
                                                            if (column.key === 'name') {
                                                                // `--raw-dot` feeds the ::before swatch, which ties a row back to its chart line.
                                                                return (
                                                                    <td key={column.key} className="mono raw-name" style={{ '--raw-dot': rawNameColors[value] } as React.CSSProperties}>
                                                                        {value}
                                                                    </td>
                                                                );
                                                            }
                                                            return (
                                                                <td key={column.key} className={`mono${column.key === 'value' && !valueColumnIsJson ? ' is-numeric' : ''}`}>
                                                                    {isNull ? <span className="is-null">NULL</span> : value}
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
                                                                        disabled={valueColumnIsJson}
                                                                        title={valueColumnIsJson ? JSON_VALUE_COLUMN_BLOCK_REASON : undefined}
                                                                        aria-label={valueColumnIsJson ? `Tag Analyzer — ${JSON_VALUE_COLUMN_BLOCK_REASON}` : undefined}
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
                <RangeEditorModal
                    range={rangeEditorRange}
                    baseKind={baseKind}
                    bounds={distanceBounds}
                    onClose={() => setRangeEditor(null)}
                    onApply={handleRangeApply}
                />
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
