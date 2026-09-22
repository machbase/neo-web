import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { VscChevronLeft, VscChevronRight } from 'react-icons/vsc';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import {
    buildDataViewerDragRangeUpdate,
    buildDataViewerEChartOption,
    buildDataViewerWheelZoomRange,
    buildDataViewerZoomControlRange,
    extractDataViewerDataZoomRange,
    formatDataViewerChartRangeEdge,
    formatDataViewerNavigatorRangeLabels,
    getDataViewerChartRangeMs,
    hasExplicitDataViewerDataZoomEventRange,
    isSameDataViewerChartRange,
    type DataViewerBaseKind,
} from './dataViewerModel';

/**
 * The page's chart, in a file of its own.
 *
 * It lived inside `DataViewerPage` while the page was its only caller. The JSON key detail view
 * needs the same chart — the same drag-to-zoom, the same wheel, the same navigator, the same shift
 * buttons — and a second implementation there is how one page ends up with two ways to operate what
 * looks like the same chart. So there is one, and both import it.
 */
export type DataViewerTimeRange = { from?: string | number; to?: string | number; start?: string | number; end?: string | number; startTime?: number; endTime?: number };

function MaterialIcon({ name, className = '' }: { name: string; className?: string }) {
    return (
        <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
            {name}
        </span>
    );
}

export function TagEChart({
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
    /**
     * The container's height, watched.
     *
     * The panel option places its plot and its navigator at absolute offsets, so it needs the height
     * to hand the plot whatever is left over — otherwise a tall container draws a short plot with a
     * band of nothing under it. Measured rather than assumed, and re-measured on resize, because the
     * chart panel is user-resizable and the modal's column is not the same size as it.
     */
    const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;
        const measure = () => setPanelHeight(container.clientHeight || undefined);
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);
    const chartRef = useRef<echarts.ECharts | null>(null);
    // Which legend entries the reader has switched off. Every option write below is `notMerge`, and
    // a legend without an explicit `selected` comes back with everything on — so hiding a series and
    // then panning, zooming or paging (all of which rewrite the option) put it straight back on
    // screen. Kept in a ref rather than state: nothing renders from it, and making it state would
    // rebuild the option on a change that is *already* drawn on the canvas by ECharts itself.
    const legendSelectedRef = useRef<Record<string, boolean>>({});
    // The series names the last option write carried, so a name's *arrival* can be told from its
    // continued presence. Without that, a switched-off entry outlives the series it belonged to:
    // untick a tag whose line you had hidden, tick it again, and it comes back invisible — the tag
    // list says it is on and the chart draws nothing, with only a greyed legend entry to explain it.
    const legendNamesRef = useRef<string[]>([]);
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
        () => buildDataViewerEChartOption({ series, timeFormat, timeZone, timeRange, displayRange, baseKind, seriesColors, panelHeight }),
        [baseKind, displayRange, panelHeight, series, seriesColors, timeFormat, timeRange, timeZone],
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
        // ECharts hands over the whole map on every toggle, so this is a replace, not a merge —
        // names that have gone away with a tag change drop out of it on the next toggle, and unknown
        // names left in it are ignored when they are written back.
        chart.on('legendselectchanged', (params: any) => {
            legendSelectedRef.current = { ...(params?.selected || {}) };
        });
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
        // Carry the reader's legend switches across the rewrite — but only for series that were
        // already here and are here still. A name that has left the chart, or one that has just
        // (re)joined it, gets its switch back: re-adding a tag is a fresh request to see it, and
        // honouring a switch the reader flipped on an earlier incarnation of that line reads as the
        // tag list and the chart disagreeing. An empty series list is a transient — the rows blank
        // while a window re-resolves — so nothing is reconciled against it.
        const seriesNames = (((options as any)?.series || []) as any[]).map((entry) => entry?.name).filter(Boolean) as string[];
        if (seriesNames.length) {
            const previous = legendNamesRef.current;
            for (const name of Object.keys(legendSelectedRef.current)) {
                if (!seriesNames.includes(name) || !previous.includes(name)) delete legendSelectedRef.current[name];
            }
            legendNamesRef.current = seriesNames;
        }
        const legend = (options as any)?.legend;
        const withLegend = legend && Object.keys(legendSelectedRef.current).length
            ? { ...(options as any), legend: { ...legend, selected: legendSelectedRef.current } }
            : options;
        chartRef.current.setOption(withLegend as any, true);
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

export default TagEChart;
