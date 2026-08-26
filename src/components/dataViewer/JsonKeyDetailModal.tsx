import { useEffect, useMemo, useState } from 'react';
import { VscArrowLeft, VscClose } from 'react-icons/vsc';
import { MuiTagAnalyzer } from '@/assets/icons/Mui';
import Modal from '@/components/modal/Modal';
import DataViewerModalPortal from './DataViewerModalPortal';
import useOutsideCloseGuard from './useOutsideCloseGuard';
import useModalDialog from './useModalDialog';
import { queryTagJsonKeyData, type DataViewerTableParams, type JsonKeyCycleRow } from './dataViewerApi';
import {
    DEFAULT_TIME_FORMAT,
    DEFAULT_TIME_ZONE,
    PANEL_COLORS,
    parseDataViewerDistanceValue,
    toDataViewerDate,
    type DataViewerBaseKind,
} from './dataViewerModel';
import TagEChart, { type DataViewerTimeRange } from './TagEChart';
import { MAX_JSON_KEY_SERIES, shortJsonKeyNames } from './jsonKeyTree';
import { PANEL_TAG_LIMIT } from '@/components/tagAnalyzer/seriesModel';
import { jsonKeyPathLabel } from '@/utils/jsonKeyCatalog';

/**
 * The selected keys, as a chart and a grid at once.
 *
 * This is the only place on the page where a JSON table has series at all: a tag alone is a
 * document, and only once keys are picked does each one name a value over time. The main chart
 * stays closed for exactly that reason.
 */

/**
 * How many keys the chart will draw at once.
 *
 * Past four lines on one value axis the chart stops answering "how does this move" and starts
 * answering "which line was mine". The keys beyond it are not dropped: they stay in the grid, which
 * is where more than four columns is perfectly readable.
 */


/**
 * Print a projected value the way the document spells it.
 *
 * `VALUE->'$[…]'` comes back as text carrying the engine's 17-significant-digit rendering of the
 * double, so a payload that reads `0.907` in the raw grid and `0.907` in the picker's preview was
 * printed `0.90700000000000003` here — three views of one number disagreeing. The chart was never
 * affected: it parses the same string to the same double.
 *
 * Deliberately narrow. Only a plain decimal already carrying more digits than a double can
 * distinguish is re-printed, and only when the round trip is actually shorter — so `3.141592653589793`
 * (which round-trips to itself), an id like `007`, a version string, and a big integer beyond
 * `Number`'s safe range are all left exactly as they arrived.
 */
const LONG_DECIMAL = /^-?\d+\.\d+$/;

const readableJsonValue = (value: unknown): string => {
    const text = String(value);
    if (!LONG_DECIMAL.test(text)) return text;
    if (text.replace(/[-.]/g, '').length < 16) return text;
    const round = String(Number(text));
    return round.length < text.length ? round : text;
};

const PAGE_SIZES = [25, 50, 100];

export interface JsonKeyDetailModalProps extends DataViewerTableParams {
    tagName: string;
    paths: string[];
    /**
     * The window, which is the page's own and the only one there is.
     *
     * This view does not re-range: the range control on the page above is what sets it, and a second
     * set of range controls in here would be a second answer to a question that already has one.
     */
    from?: string | number;
    to?: string | number;
    tagColumn?: string;
    timeColumn?: string;
    valueColumn?: string;
    baseKind?: DataViewerBaseKind;
    /** Header of the base column, as the table names it. */
    baseLabel?: string;
    /** The page's own base formatter, so a timestamp reads the same here as in the grid behind. */
    formatBase?: (value: unknown) => string;
    /** Passed to the shared chart option, so this axis is labelled like every other on the page. */
    timeFormat?: string;
    timeZone?: string;
    /** Back to the picker the selection came from. Absent when there is nothing to go back to. */
    onBack?: () => void;
    /**
     * Hand the plotted keys to Tag Analyzer. Absent when this table cannot be handed over.
     *
     * The window goes with them: a chip may have moved this view off the page's range, and handing
     * over the page's range instead would open a board showing a different span than the chart the
     * user was looking at when they asked for it.
     */
    onOpenTagAnalyzer?: (paths: string[], window: { from?: string | number; to?: string | number }) => void;
    onClose: () => void;
}

const asNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};



/** The x a base value sits on: epoch milliseconds on a clock, the number itself on a distance axis. */
const baseAt = (value: unknown, baseKind: DataViewerBaseKind) =>
    baseKind === 'distance' ? parseDataViewerDistanceValue(value) : (toDataViewerDate(value)?.getTime() ?? null);

export const JsonKeyDetailModal = ({
    dbName,
    userName,
    tableName,
    tagName,
    paths,
    from,
    to,
    tagColumn,
    timeColumn,
    valueColumn,
    baseKind = 'time',
    baseLabel = 'TIME',
    formatBase,
    timeFormat = DEFAULT_TIME_FORMAT,
    timeZone = DEFAULT_TIME_ZONE,
    onBack,
    onOpenTagAnalyzer,
    onClose,
}: JsonKeyDetailModalProps) => {
    const [rows, setRows] = useState<JsonKeyCycleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [page, setPage] = useState(0);
    // A drag that began inside and ended past the edge is still that gesture, not a click
    // outside — see `useOutsideCloseGuard`.
    const closeOnOutside = useOutsideCloseGuard(onClose);
    // Names the dialog, puts focus in it and keeps Tab inside — see the hook.
    const dialogRef = useModalDialog<HTMLDivElement>(`Key detail for ${tagName}`);

    /**
     * A zoom the user made inside the plot, which lasts until they page.
     *
     * The page is what normally decides the span (see `displayRange` below) — this is the temporary
     * closer look on top of it, reported by the chart rather than held by it.
     */
    const [zoomRange, setZoomRange] = useState<DataViewerTimeRange | undefined>(undefined);
    useEffect(() => setZoomRange(undefined), [from, to]);

    useEffect(() => {
        let alive = true;
        // Range chips can be clicked faster than a scan comes back. `alive` already stops a stale
        // answer from landing; aborting stops the server from finishing a read nobody will read.
        const abort = new AbortController();
        setLoading(true);
        setError('');
        queryTagJsonKeyData({
            dbName,
            userName,
            tableName,
            tagName,
            paths,
            from,
            to,
            tagColumn,
            timeColumn,
            valueColumn,
            baseKind,
            signal: abort.signal,
        })
            .then((result) => {
                if (!alive) return;
                setRows(result.rows);
                setPage(0);
            })
            .catch((reason) => {
                if (!alive) return;
                setError(reason instanceof Error ? reason.message : 'Failed to load data');
                setRows([]);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
            abort.abort();
        };
    }, [baseKind, dbName, from, paths, tagColumn, tagName, tableName, timeColumn, to, userName, valueColumn]);

    /** Every selected key, as the grid names it — dotted, and shortened only where names collide. */
    // An empty path is the column itself — a document that is a bare value has no key to name — so
    // it borrows the column's name rather than rendering as a blank header.
    const columnNames = useMemo(
        () => shortJsonKeyNames(paths.map((path) => jsonKeyPathLabel(path) || valueColumn || path)),
        [paths, valueColumn]
    );

    /**
     * Which keys the chart draws, decided by the data rather than by the row that was picked from.
     *
     * The picker guesses from one sample; here every value in the window has been read, so a key
     * that holds text in the sample and numbers everywhere else still plots, and a key that holds
     * nothing numeric anywhere is named below the chart instead of drawn as a flat zero.
     */
    const { series, chartableCount, chartableIndexes } = useMemo(() => {
        const chartable: number[] = [];
        paths.forEach((_path, index) => {
            if (rows.some((row) => asNumber(row.values[index]) !== null)) chartable.push(index);
        });

        const drawn = chartable.slice(0, MAX_JSON_KEY_SERIES);
        return {
            chartableIndexes: chartable,
            chartableCount: chartable.length,
            series: drawn.map((index) => ({
                index,
                name: columnNames[index] ?? paths[index],
                /**
                 * Only the cycles this key was actually written in.
                 *
                 * A tag can carry several keys written on different cycles, so a key's value is
                 * absent from every cycle that belonged to another one. Passing those through as
                 * nulls is what made the chart come up blank: the shared option draws with
                 * `showSymbol: false` and `connectNulls: false`, so a real point with a null on
                 * either side is a segment of length one and nothing is drawn for it. A cycle
                 * without this key is not a point on this key's line — the same rule the page's own
                 * `buildTagChartSeries` follows for a tag that has no row at a timestamp.
                 */
                data: rows
                    .map((row) => [baseAt(row.base, baseKind), asNumber(row.values[index])] as [number | null, number | null])
                    .filter((point): point is [number, number] => point[0] !== null && point[1] !== null)
                    .sort((left, right) => left[0] - right[0]),
            })),
        };
    }, [baseKind, columnNames, paths, rows]);

    const baseValues = useMemo(() => rows.map((row) => (formatBase ? formatBase(row.base) : String(row.base ?? ''))), [formatBase, rows]);

    /**
     * The grid reads one row per value, not one column per key.
     *
     * A cycle carries whichever keys were written in it, so a column per key fills the table with
     * NULLs for every key that was not — on a tag whose keys are written on separate cycles that is
     * most of the screen. A record per value is what the page's own raw grid shows, it says the
     * same thing without the blanks, and picking one more key makes the table longer rather than
     * wider.
     */
    const valueRows = useMemo(() => {
        const out: { base: string; raw: unknown; name: string; path: string; value: unknown }[] = [];
        rows.forEach((row, rowIndex) => {
            paths.forEach((path, keyIndex) => {
                const value = row.values[keyIndex];
                if (value === null || value === undefined) return;
                out.push({ base: baseValues[rowIndex], raw: row.base, name: columnNames[keyIndex] ?? path, path, value });
            });
        });
        return out;
    }, [baseValues, columnNames, paths, rows]);

    /**
     * The colour each key's line is drawn in, keyed by path.
     *
     * The grid carries the same dot the page's raw grid puts beside a tag name, so a row here and a
     * line up there are matched by eye rather than by reading the legend twice. The palette and the
     * order are the shared option's own — a key the chart could not draw simply has no colour, and
     * no dot.
     */
    const seriesColorByPath = useMemo(() => {
        const colors: Record<string, string> = {};
        series.forEach((entry, slot) => {
            colors[paths[entry.index]] = PANEL_COLORS[slot % PANEL_COLORS.length];
        });
        return colors;
    }, [paths, series]);

    const pageCount = Math.max(1, Math.ceil(valueRows.length / pageSize));
    const currentPage = Math.min(page, pageCount - 1);
    const firstRow = currentPage * pageSize;
    const pageRows = valueRows.slice(firstRow, firstRow + pageSize);

    /**
     * The span the chart draws, which is the span the grid is showing.
     *
     * This is the whole reason the two are on screen together — the chart is the shape of the rows
     * underneath it, so paging moves both. The navigator still spans the whole window, which is
     * what puts the current page in context rather than leaving it floating. A zoom made inside the
     * plot overrides it until the next page, which is a deliberate closer look and should not be
     * thrown away by a re-render.
     */
    const displayRange = useMemo<DataViewerTimeRange | undefined>(() => {
        if (zoomRange) return zoomRange;
        if (pageRows.length === 0) return undefined;
        const first = pageRows[0].raw as string | number;
        const last = pageRows[pageRows.length - 1].raw as string | number;
        // A page whose values all share one timestamp would ask the axis for a window of zero width,
        // which collapses the plot to a single instant and leaves every zoom control with nothing to
        // act on. Falling back to the whole window is worse than that though: the chart then draws
        // an hour while the grid shows one instant, with nothing saying they differ. Reach to the
        // nearest cycle outside the page instead — a real edge, in the axis's own units, no
        // arithmetic and no invented span. Only when the neighbours share the instant too, which
        // means there is genuinely nothing else to show, does the whole window stand.
        if (String(first) === String(last)) {
            const before = valueRows[firstRow - 1]?.raw as string | number | undefined;
            const after = valueRows[firstRow + pageRows.length]?.raw as string | number | undefined;
            if (before !== undefined && String(before) !== String(first)) return { from: before, to: last };
            if (after !== undefined && String(after) !== String(first)) return { from: first, to: after };
            return undefined;
        }
        return { from: first, to: last };
    }, [firstRow, pageRows, valueRows, zoomRange]);

    // Paging is a new span, so the closer look that belonged to the previous one goes with it —
    // but only when the page actually moves. The chart's shift arrows do not know where the pages
    // end and stay enabled there, and discarding a zoom for a page that did not change is a loss
    // with nothing gained.
    const goToPage = (next: number) => {
        const target = Math.min(Math.max(next, 0), pageCount - 1);
        if (target === currentPage) return;
        setZoomRange(undefined);
        setPage(target);
    };

    // The header has room for the whole path, and is the one place that says exactly which key
    // this is — the legend and the grid shorten instead, because they repeat it on every row.
    const fullNames = useMemo(() => paths.map((path) => jsonKeyPathLabel(path) || valueColumn || path), [paths, valueColumn]);
    const title = paths.length > 1 ? `${fullNames[0]} +${paths.length - 1}` : fullNames[0] || tagName;
    // Say `4 of 200` rather than `4` when the cap has bitten: the picker counted the keys that could
    // be drawn, and arriving at four lines with no arithmetic to explain it reads as data missing.
    const seriesLabel = chartableCount > series.length ? `${series.length} of ${chartableCount} series` : `${series.length} series`;
    const meta = [tagName, `${valueRows.length} rows`, seriesLabel, zoomRange ? 'zoomed' : ''].filter(Boolean).join(' · ');
    // The header centres this, so every character it keeps is a character taken off the key name on
    // its left. When both edges fall on the same day the date is printed twice for no reader — drop
    // the repeat and the label loses about a third of its width. Written as a prefix comparison
    // rather than a date parse so a distance axis, whose edges are plain numbers, falls straight
    // through to the two-part form. The whole thing stays on the `title` either way.
    const windowLabel = useMemo(() => {
        const start = formatBase ? formatBase(from) : `${from ?? ''}`;
        const end = formatBase ? formatBase(to) : `${to ?? ''}`;
        const full = `${start} → ${end}`;
        const day = /^(\d{4}-\d{2}-\d{2}) /.exec(start);
        const sameDay = day && end.startsWith(day[1] + ' ');
        return { text: sameDay ? `${start} → ${end.slice(day[1].length + 1)}` : full, full };
    }, [formatBase, from, to]);
    /**
     * What Tag Analyzer is handed.
     *
     * Every key that *has* numbers, not only the four this chart draws: the cap is this modal's,
     * for its own legend, and silently dropping the rest on the way out would make the handoff lose
     * data the user picked. The window is the one on screen — a zoom or a page is where they were
     * looking, and arriving at the full hour instead is arriving somewhere else.
     */
    // Tag Analyzer refuses a payload of more than `PANEL_TAG_LIMIT` tags outright, and a refusal
    // here is expensive: it used to surface as an internal string in the page's error box while both
    // modals came down, taking a forty-key selection with them. So the cap is applied on this side,
    // where it can be said out loud on the button rather than discovered by pressing it.
    const analyzableAll = chartableIndexes.map((index) => paths[index]);
    const analyzablePaths = analyzableAll.slice(0, PANEL_TAG_LIMIT);
    const analyzeCapped = analyzableAll.length - analyzablePaths.length;
    const analyzeWindow = displayRange ?? { from, to };

    return (
        // Same page-owned modal parts as the picker — see the note there.
        <DataViewerModalPortal>
            <Modal pIsDarkMode className="json-key-modal json-key-detail-modal" onOutSideClose={closeOnOutside}>
                <div ref={dialogRef} className="modal-header json-key-detail-head">
                    <div className="modal-header-title json-key-modal-title">
                        <span title={fullNames.join(', ')}>{title}</span>
                        <span className="json-key-modal-sub">{meta}</span>
                    </div>
                    {/* Centred, because the window belongs to neither side it sits between: the title
                        on the left names the key, the controls on the right act on it, and this is
                        the one thing both of them are true only within. */}
                    <span className="json-key-detail-window" title={windowLabel.full}>
                        {windowLabel.text}
                    </span>
                    <div className="json-key-detail-head-actions">
                        {onOpenTagAnalyzer ? (
                            <button
                                type="button"
                                className="json-key-detail-handoff"
                                onClick={() => onOpenTagAnalyzer(analyzablePaths, analyzeWindow)}
                                disabled={analyzablePaths.length === 0}
                                title={
                                    analyzablePaths.length === 0
                                        ? 'Nothing numeric to analyze'
                                        : analyzeCapped > 0
                                          ? `Open the first ${PANEL_TAG_LIMIT} of ${analyzableAll.length} keys in Tag Analyzer`
                                          : 'Open in Tag Analyzer'
                                }
                                // Icon only: the word beside its own icon says the same thing twice,
                                // and the name is still on the button as its tooltip and its label.
                                aria-label="Open in Tag Analyzer"
                            >
                                <MuiTagAnalyzer width={18} height={18} />
                            </button>
                        ) : null}
                        <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Close">
                            <VscClose />
                        </button>
                    </div>
                </div>

                <div className="modal-body json-key-modal-body">
                    {error ? <div className="json-key-detail-error">{error}</div> : null}

                    {/* Side by side, because the one is the shape of the other: the chart draws the
                        rows the grid is showing, and reading them stacked meant scrolling away from
                        whichever half you were not looking at. */}
                    <div className="json-key-detail-split">
                        <div className="json-key-detail-chart-col">
                            {/* The page's own chart, imported rather than rebuilt — the drag, the
                                wheel, the navigator and the shift buttons are the ones the chart
                                panel has, so there is one way to operate a chart on this page. */}
                            <div className="json-key-detail-chart">
                                <TagEChart
                                    series={series.map((entry) => ({ name: entry.name, data: entry.data }))}
                                    timeFormat={timeFormat}
                                    timeZone={timeZone}
                                    timeRange={{ from, to }}
                                    displayRange={displayRange}
                                    baseKind={baseKind}
                                    pending={loading}
                                    onDisplayRangeChange={(range) => setZoomRange(range)}
                                    // The chart's own shift arrows and the pager are the same
                                    // control: one span at a time, moved one span at a time.
                                    onShiftMainRange={(direction) => goToPage(currentPage + (direction === 'forward' ? 1 : -1))}
                                />
                            </div>

                        </div>

                        <div className="json-key-detail-grid-col">
                            <div className="json-key-detail-grid">
                                {loading ? <div className="empty-state">Loading...</div> : null}
                                {!loading && valueRows.length === 0 && !error ? <div className="empty-state">No data in this range.</div> : null}
                                {!loading && valueRows.length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>{baseLabel}</th>
                                                <th>KEY</th>
                                                <th className="is-numeric">VALUE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageRows.map((row, index) => (
                                                <tr key={`${firstRow + index}`}>
                                                    <td className="mono">{row.base}</td>
                                                    <td
                                                        className="mono json-key-detail-name"
                                                        style={{ '--raw-dot': seriesColorByPath[row.path] } as React.CSSProperties}
                                                        title={jsonKeyPathLabel(row.path) || valueColumn}
                                                    >
                                                        {row.name}
                                                    </td>
                                                    <td className="mono is-numeric">{readableJsonValue(row.value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : null}
                            </div>

                            <div className="json-key-detail-pager">
                                <span className="json-key-modal-count">
                                    {valueRows.length === 0
                                        ? '0 rows'
                                        : `${firstRow + 1}–${Math.min(firstRow + pageSize, valueRows.length)} of ${valueRows.length} rows`}
                                </span>
                                <div className="json-key-detail-pager-controls">
                                    <button
                                        type="button"
                                        className="json-key-detail-step"
                                        onClick={() => goToPage(0)}
                                        disabled={currentPage === 0}
                                        aria-label="First page"
                                    >
                                        «
                                    </button>
                                    <button
                                        type="button"
                                        className="json-key-detail-step"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 0}
                                        aria-label="Previous page"
                                    >
                                        ‹
                                    </button>
                                    <span className="json-key-detail-page">
                                        {currentPage + 1} / {pageCount}
                                    </span>
                                    <button
                                        type="button"
                                        className="json-key-detail-step"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage >= pageCount - 1}
                                        aria-label="Next page"
                                    >
                                        ›
                                    </button>
                                    <button
                                        type="button"
                                        className="json-key-detail-step"
                                        onClick={() => goToPage(pageCount - 1)}
                                        disabled={currentPage >= pageCount - 1}
                                        aria-label="Last page"
                                    >
                                        »
                                    </button>
                                </div>
                                <div className="json-key-detail-sizes" role="group" aria-label="Rows per page">
                                    {PAGE_SIZES.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            className={`json-key-detail-chip${pageSize === size ? ' is-active' : ''}`}
                                            onClick={() => {
                                                setPageSize(size);
                                                setPage(0);
                                                // Same reason `goToPage` does it: this is a new span,
                                                // and keeping the old zoom leaves the chart looking
                                                // at rows the grid beside it is no longer showing.
                                                setZoomRange(undefined);
                                            }}
                                            aria-pressed={pageSize === size}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer json-key-detail-foot">
                    {/* Close only dismisses. Back is where this view leads on to — you came from the
                        picker to read these keys and go back to change them — so it takes the primary
                        and the last position, which is where the footer's forward button always is. */}
                    <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    {onBack ? (
                        <button type="button" className="btn btn-sm btn-primary" onClick={onBack}>
                            <VscArrowLeft className="icon-sm" /> Back to keys
                        </button>
                    ) : null}
                </div>
            </Modal>
        </DataViewerModalPortal>
    );
};

export default JsonKeyDetailModal;
