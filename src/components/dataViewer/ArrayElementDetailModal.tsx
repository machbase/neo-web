import ValueDetailDialog, { ValueDetailPager } from './ValueDetailDialog';
import { useEffect, useMemo, useState } from 'react';
import type { ArrayColumnMetadata } from '@/utils/arrayValue';
import { PANEL_TAG_LIMIT } from '@/components/tagAnalyzer/seriesModel';
import { queryTagArrayElementData, queryTagArrayBoundaryRange, type DataViewerTableParams } from './dataViewerApi';
import TagEChart, { type DataViewerTimeRange } from './TagEChart';
import { formatDataViewerBaseValue, parseDataViewerDistanceValue, toDataViewerDate, type DataViewerBaseKind } from './dataViewerModel';
import { arrayTimestampMilliseconds, arrayTimestampIso, type ArrayTimeUnit } from './arrayTimestamp';
import './arrayElements.scss';

type Row = { base: unknown; values: unknown[] };
type Range = { from?: string | number; to?: string | number; timeUnit?: ArrayTimeUnit };
// Conservative safeguard until the target server/browser performance has been measured.
const CHART_ROW_BUDGET = 20_000;
const COLUMN_WIDTH = 170;
const BASE_WIDTH = 220;
const at = (value: unknown, kind: DataViewerBaseKind, timeUnit?: ArrayTimeUnit) => {
    if (kind === 'distance') return parseDataViewerDistanceValue(value);
    if (timeUnit !== 'ns') return toDataViewerDate(value)?.getTime() ?? null;
    try { return arrayTimestampMilliseconds(value); } catch { return null; }
};
// SQL timestamps arrive as lossless nanosecond strings. Display conversion to Date
// truncates sub-millisecond differences and must not decide the query boundaries.
const sameBase = (first: unknown, last: unknown, kind: DataViewerBaseKind) =>
    kind === 'time' ? first === last : at(first, kind) === at(last, kind);
const numberValue = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value); return Number.isFinite(number) ? number : null;
};

export interface ArrayElementDetailProps extends DataViewerTableParams {
    tagName: string; indexes: number[]; metadata: ArrayColumnMetadata;
    from?: string | number; to?: string | number;
    tagColumn: string; timeColumn: string; valueColumn: string; baseKind: DataViewerBaseKind;
    formatBase: (value: unknown) => string; timeFormat: string; timeZone: string;
    onBack: () => void; onClose: () => void;
    onOpenTagAnalyzer: (indexes: number[], range: Range) => string | void;
}

export default function ArrayElementDetailModal(props: ArrayElementDetailProps) {
    const { dbName, userName, tableName, tagName, indexes, metadata, from, to, tagColumn, timeColumn, valueColumn, baseKind, formatBase, timeFormat, timeZone, onBack, onClose, onOpenTagAnalyzer } = props;
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [table, setTable] = useState<{ rows: Row[]; hasMore: boolean; request?: object }>({ rows: [], hasMore: false });
    const [boundaryRange, setBoundaryRange] = useState<Range>();
    const [chartRows, setChartRows] = useState<Row[]>([]);
    const [shown, setShown] = useState(() => indexes.slice(0, 4));
    const [zoom, setZoom] = useState<Range>();
    const [tableLoading, setTableLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [tableError, setTableError] = useState('');
    const [chartError, setChartError] = useState('');
    const [handoffError, setHandoffError] = useState('');
    const [retry, setRetry] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const query = useMemo(() => ({ dbName, userName, tableName, tagName, tagColumn, timeColumn, valueColumn, baseKind, metadata }), [dbName, userName, tableName, tagName, tagColumn, timeColumn, valueColumn, baseKind, metadata]);

    // Match the successful table result to this render's request, including the render
    // before the loading effect runs after a page, filter, or retry change.
    const tableRequest = useMemo(() => ({}), [query, indexes, from, to, page, pageSize, retry]);
    const canOpenAnalyzer = table.request === tableRequest && !tableLoading && !tableError;

    useEffect(() => { setPage(0); setZoom(undefined); }, [from, to]);

    useEffect(() => {
        let alive = true; const abort = new AbortController();
        setTableLoading(true); setTableError(''); setTable({ rows: [], hasMore: false }); setBoundaryRange(undefined);
        setChartRows([]); setChartError(''); setChartLoading(true);
        queryTagArrayElementData({ ...query, indexes, from, to, page, pageSize, signal: abort.signal })
            .then(async (result) => {
                if (!alive) return;
                const first = result.rows[0]?.base;
                const last = result.rows[result.rows.length - 1]?.base;
                if (first !== undefined && sameBase(first, last, baseKind)) {
                    const boundary = await queryTagArrayBoundaryRange({ ...query, from, to, anchor: first as string | number, anchorTimeUnit: baseKind === 'time' ? 'ns' : undefined, signal: abort.signal });
                    if (!alive) return;
                    if (boundary.from !== undefined && boundary.to !== undefined) setBoundaryRange(boundary);
                }
                setTable({ ...result, request: tableRequest });
            })
            .catch((error) => { if (alive) { setTableError(error instanceof Error ? error.message : 'Unable to load array elements'); setChartLoading(false); } })
            .finally(() => { if (alive) setTableLoading(false); });
        return () => { alive = false; abort.abort(); };
    }, [query, indexes, from, to, page, pageSize, retry, tableRequest]);

    const pageRange = useMemo<Range>(() => {
        if (!table.rows.length) return { from, to };
        const first = table.rows[0].base as string | number;
        const last = table.rows[table.rows.length - 1].base as string | number;
        // The boundary query supplies a distinct neighbour when one exists. Otherwise the real
        // enclosing window is used; the plot-only padding never becomes a SQL bound.
        return sameBase(first, last, baseKind) ? boundaryRange ?? { from, to } : { from: first, to: last, timeUnit: baseKind === 'time' ? 'ns' : undefined };
    }, [table.rows, boundaryRange, from, to, baseKind]);
    const actualRange = zoom ?? pageRange;
    const rangeStart = at(actualRange.from, baseKind, actualRange.timeUnit);
    const rangeEnd = at(actualRange.to, baseKind, actualRange.timeUnit);
    const displayRange = useMemo<Range>(() => actualRange.timeUnit === 'ns' ? {
        from: arrayTimestampIso(actualRange.from), to: arrayTimestampIso(actualRange.to),
    } : actualRange, [actualRange]);
    const validHandoff = rangeStart !== null && rangeEnd !== null && rangeStart < rangeEnd;
    const singleton = rangeStart !== null && rangeStart === rangeEnd;
    const plotRange = useMemo<Range>(() => singleton ? {
        from: baseKind === 'time' ? new Date(rangeStart! - 1).toISOString() : rangeStart! - Math.max(Math.abs(rangeStart!) * Number.EPSILON * 2, 1e-6),
        to: baseKind === 'time' ? new Date(rangeEnd! + 1).toISOString() : rangeEnd! + Math.max(Math.abs(rangeEnd!) * Number.EPSILON * 2, 1e-6),
    } : displayRange, [singleton, rangeStart, rangeEnd, baseKind, displayRange]);

    useEffect(() => {
        if (tableLoading || tableError) return;
        let alive = true; const abort = new AbortController();
        setChartLoading(true); setChartError(''); setChartRows([]);
        if (!shown.length || !table.rows.length) { setChartLoading(false); return; }
        queryTagArrayElementData({ ...query, indexes: shown, from: actualRange.from, to: actualRange.to, timeUnit: actualRange.timeUnit, page: 0, pageSize: CHART_ROW_BUDGET, signal: abort.signal })
            .then((result) => {
                if (!alive) return;
                if (result.hasMore) setChartError('This range exceeds the temporary chart limit. The chart is not shown in full. Use the table or choose a smaller range; identical timestamps cannot be separated by narrowing the range.');
                else setChartRows(result.rows);
            })
            .catch((error) => { if (alive) setChartError(error instanceof Error ? error.message : 'Unable to load chart'); })
            .finally(() => { if (alive) setChartLoading(false); });
        return () => { alive = false; abort.abort(); };
    }, [query, shown, actualRange.from, actualRange.to, actualRange.timeUnit, tableLoading, tableError, table.rows.length, retry]);

    const series = useMemo(() => shown.map((index, slot) => ({ name: `${valueColumn}[${index}]`, data: chartRows.flatMap((row): [number, number | null][] => {
        const base = at(row.base, baseKind, 'ns'); return base === null ? [] : [[base, numberValue(row.values[slot])]];
    }) })), [shown, chartRows, valueColumn, baseKind]);
    const noValues = series.filter((entry) => !entry.data.some((point) => point[1] !== null)).map((entry) => entry.name);
    const goPage = (next: number) => { if (next < 0 || next === page || tableLoading || (next > page && !table.hasMore)) return; setZoom(undefined); setPage(next); setHandoffError(''); };
    const firstColumn = Math.max(0, Math.floor(Math.max(0, scrollLeft - BASE_WIDTH) / COLUMN_WIDTH) - 1);
    const visibleIndexes = indexes.slice(firstColumn, firstColumn + 9);
    const beforeWidth = firstColumn * COLUMN_WIDTH;
    const afterWidth = Math.max(0, indexes.length - firstColumn - visibleIndexes.length) * COLUMN_WIDTH;
    const openAnalyzer = () => {
        if (!canOpenAnalyzer) return;
        if (!validHandoff) { setHandoffError('Choose a range whose start is before its end.'); return; }
        if (indexes.length > PANEL_TAG_LIMIT) { setHandoffError(`Tag Analyzer supports up to ${PANEL_TAG_LIMIT} elements. Reduce the selection.`); return; }
        setHandoffError(onOpenTagAnalyzer(indexes, displayRange) || '');
    };
    const windowText = `${formatDataViewerBaseValue(displayRange.from, baseKind, timeFormat, timeZone)} → ${formatDataViewerBaseValue(displayRange.to, baseKind, timeFormat, timeZone)}`;
    const message = handoffError || tableError || chartError || (!tableLoading && !chartLoading && noValues.length ? `No values to plot: ${noValues.join(', ')}` : '');
    const names = indexes.map(index => `${valueColumn}[${index}]`);
    return <ValueDetailDialog className="array-element-modal" label={`Array detail for ${tagName}`}
        title={names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]} titleTooltip={names.join(', ')}
        meta={<>{tagName} · {table.rows.length} rows · {shown.length} series {indexes.length > 4 ? <span className="array-chart-selection">{shown.map((index, slot) => <select className="json-key-detail-chip" key={slot} aria-label={`Chart element ${slot + 1}`} value={index} onChange={(event) => setShown(old => old.map((value, position) => position === slot ? Number(event.target.value) : value))}>{indexes.map(value => <option key={value} value={value} disabled={shown.includes(value) && value !== index}>{valueColumn}[{value}]</option>)}</select>)}</span> : null}</>}
        windowLabel={{text: windowText, full: windowText}} onClose={onClose} onBack={onBack} backLabel="Back to elements"
        analyzer={{onClick: openAnalyzer, disabled: !canOpenAnalyzer}}
        error={message ? <>{message}{tableError || chartError ? <button className="btn btn-sm btn-ghost" onClick={() => setRetry(value => value + 1)}>Retry</button> : null}</> : undefined}
        chart={<div className="array-detail-chart"><TagEChart arrayElements series={series} timeFormat={timeFormat} timeZone={timeZone} baseKind={baseKind} timeRange={singleton ? plotRange : { from, to }} displayRange={plotRange} pending={chartLoading || tableLoading || Boolean(chartError)}
                onDisplayRangeChange={singleton ? undefined : (range: DataViewerTimeRange) => setZoom({ from: range.from, to: range.to })}
                onShiftMainRange={(direction) => goPage(page + (direction === 'forward' ? 1 : -1))} /></div>}
        grid={tableLoading ? <div className="json-key-detail-grid empty-state" role="status">Loading...</div> : <div className="array-detail-grid json-key-detail-grid" onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}>
                <table style={{ width: BASE_WIDTH + indexes.length * COLUMN_WIDTH }}><colgroup><col style={{ width: BASE_WIDTH }} />{beforeWidth ? <col style={{ width: beforeWidth }} /> : null}{visibleIndexes.map((index) => <col key={index} style={{ width: COLUMN_WIDTH }} />)}{afterWidth ? <col style={{ width: afterWidth }} /> : null}</colgroup>
                    <thead><tr><th>{timeColumn}</th>{beforeWidth ? <th aria-hidden /> : null}{visibleIndexes.map((index) => <th className="is-numeric" key={index}>{valueColumn}[{index}]</th>)}{afterWidth ? <th aria-hidden /> : null}</tr></thead>
                    <tbody>{table.rows.map((row, position) => <tr key={position}><td className="mono">{formatBase(row.base)}</td>{beforeWidth ? <td aria-hidden /> : null}{visibleIndexes.map((index, slot) => <td className="mono is-numeric" key={index}>{row.values[firstColumn + slot] === null ? 'NULL' : String(row.values[firstColumn + slot] ?? '')}</td>)}{afterWidth ? <td aria-hidden /> : null}</tr>)}</tbody>
                </table>{!table.rows.length ? <p>No data in this range.</p> : null}
            </div>}
        pager={<ValueDetailPager page={page} pageSize={pageSize} loading={tableLoading} hasMore={table.hasMore}
            count={table.rows.length ? `${page * pageSize + 1}–${page * pageSize + table.rows.length} rows` : '0 rows'}
            onPage={goPage} onPageSize={size => { setPageSize(size); setPage(0); setZoom(undefined); }} />}
    />;
}
