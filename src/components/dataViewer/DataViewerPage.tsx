import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Highcharts from 'highcharts/highstock';
import HighchartsBoost from 'highcharts/modules/boost';
import HighchartsReact from 'highcharts-react-official';
import {
    MdCalendarMonth,
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
    VscChevronDown,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { MdPublic, MdQueryStats } from 'react-icons/md';
import NeoTimeRangeModal from '@/components/modal/TimeRangeModal';
import { TimeZoneModal as NeoTimeZoneModal } from '@/components/modal/TimeZoneModal';
import { DataViewerAssetHierarchy, DataViewerTag, listTableTags, queryTagBoundaryTime, queryTagData, queryTagDataTotal } from './dataViewerApi';
import {
    DEFAULT_TIME_FORMAT,
    DEFAULT_TIME_ZONE,
    buildAssetTreeRows,
    buildDataViewerChartXAxis,
    buildTagChartSeries,
    buildDataViewerHeaderLabels,
    buildRawResultColumns,
    filterDataViewerTags,
    filterVisibleAssetRows,
    formatDataViewerAxisTime,
    formatDataViewerTime,
    formatTimeRangeLabel,
    getScanDirectionLabel,
    getTimeFormatLabel,
    getTimeZoneLabel,
    resolveTimeRangeInput,
    toDataViewerDate,
} from './dataViewerModel';
import './DataViewerPage.scss';

const applyHighchartsBoost = HighchartsBoost as unknown as ((highcharts: typeof Highcharts) => void) | undefined;
if (typeof applyHighchartsBoost === 'function') {
    applyHighchartsBoost(Highcharts);
}

const RESULT_PAGE_SIZE = 100;
const MIN_CHART_HEIGHT = 260;

type ResultRow = Record<string, unknown>;
type DataViewerTimeRange = { from: string | number; to: string | number };

const getParam = (params: URLSearchParams, key: string) => params.get(key)?.trim() ?? '';

function ResultPagination({
    page,
    pageSize,
    rowCount,
    loading,
    endLoading,
    onPage,
    onEndPage,
}: {
    page: number;
    pageSize: number;
    rowCount: number;
    loading: boolean;
    endLoading: boolean;
    onPage: (page: number) => void;
    onEndPage: () => void;
}) {
    const [value, setValue] = useState(String(page));
    const hasNextPage = rowCount >= pageSize;

    useEffect(() => {
        setValue(String(page));
    }, [page]);

    const go = (next: number) => {
        onPage(Math.max(1, next));
    };

    const commit = () => {
        const n = Number(value);
        if (Number.isFinite(n)) go(Math.floor(n));
        else setValue(String(page));
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
            <button type="button" className="btn btn-sm btn-ghost" disabled={loading || endLoading} onClick={onEndPage} aria-label="Move to end page" title="Move to end page">
                <MdKeyboardDoubleArrowRight className="icon-sm" />
            </button>
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
            pStartTime={range.from}
            pEndTime={range.to}
            pSetTime={() => undefined}
            pSaveCallback={(from, to) => onApply({ from: from ?? '', to: to ?? '' })}
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

function TagLineChart({
    rows,
    timeFormat,
    timeZone,
    timeRange,
}: {
    rows: ResultRow[];
    timeFormat: string;
    timeZone: string;
    timeRange: DataViewerTimeRange;
}) {
    const chartRef = useRef<HighchartsReact.RefObject>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [chartSize, setChartSize] = useState({ width: 0, height: MIN_CHART_HEIGHT });
    const series = useMemo(() => buildTagChartSeries(rows), [rows]);
    const allPoints = useMemo(() => series.flatMap((item) => item.data), [series]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;

        const updateSize = (entry?: ResizeObserverEntry) => {
            const rect = entry?.contentRect || container.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.max(MIN_CHART_HEIGHT, Math.floor(rect.height));

            setChartSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
        };

        const observer = new ResizeObserver((entries) => {
            updateSize(entries[0]);
        });

        observer.observe(container);
        updateSize();

        return () => observer.disconnect();
    }, []);

    const options = useMemo<Highcharts.Options | null>(() => {
        if (allPoints.length === 0) return null;

        const xAxisRange = buildDataViewerChartXAxis(allPoints, timeRange);
        const yValues = allPoints.map((point) => point[1]);
        const yMin = Math.floor(Math.min(...yValues) * 1000) / 1000;
        const yMax = Math.ceil(Math.max(...yValues) * 1000) / 1000;
        const yPadding = yMin === yMax ? Math.max(1, Math.abs(yMin) * 0.1) : 0;

        return {
            accessibility: { enabled: false },
            chart: {
                backgroundColor: '#252525',
                height: chartSize.height,
                width: chartSize.width || undefined,
                spacing: [10, 10, 15, 10],
                type: 'line',
                animation: false,
                style: {
                    fontFamily: 'Open Sans, Helvetica, Arial, sans-serif',
                },
            },
            time: {
                useUTC: false,
            } as any,
            series: series.map((item) => ({
                type: 'line',
                name: item.name,
                data: item.data,
                yAxis: 0,
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
            })),
            plotOptions: {
                boost: {
                    useGPUTranslations: true,
                    seriesThreshold: 5,
                },
                series: {
                    boostThreshold: 5000,
                    showInNavigator: false,
                    lineWidth: 1,
                    fillOpacity: 0,
                    cursor: 'pointer',
                    marker: {
                        enabled: false,
                        radius: 0,
                    },
                    states: {
                        hover: {
                            enabled: true,
                            lineWidthPlus: 0,
                            lineWidth: 0,
                        },
                    },
                    dataGrouping: {
                        enabled: false,
                    },
                },
            },
            scrollbar: {
                liveRedraw: false,
                enabled: false,
            },
            rangeSelector: {
                buttons: [],
                allButtonsEnabled: false,
                selected: 1,
                inputEnabled: false,
            },
            navigator: {
                enabled: false,
            },
            xAxis: {
                type: 'datetime',
                ordinal: false,
                gridLineWidth: 1,
                gridLineColor: '#323333',
                lineColor: '#323333',
                min: xAxisRange.min,
                max: xAxisRange.max,
                tickInterval: xAxisRange.tickInterval,
                crosshair: {
                    snap: false,
                    width: 0.5,
                    color: 'red',
                },
                labels: {
                    align: 'center',
                    formatter: function () {
                        return formatDataViewerAxisTime(this.value, xAxisRange, timeZone);
                    },
                    style: {
                        color: '#f8f8f8',
                        fontSize: '10px',
                    },
                    y: 35,
                },
                tickColor: '#323333',
            },
            yAxis: [
                {
                    tickAmount: 5,
                    min: yMin - yPadding,
                    max: yMax + yPadding,
                    gridLineWidth: 1,
                    gridLineColor: '#323333',
                    lineColor: '#323333',
                    startOnTick: true,
                    endOnTick: true,
                    labels: {
                        align: 'center',
                        style: {
                            color: '#afb5bc',
                            fontSize: '10px',
                        },
                        x: -5,
                        y: 3,
                    },
                    opposite: false,
                },
            ],
            tooltip: {
                split: false,
                shared: true,
                followPointer: true,
                backgroundColor: '#1f1d1d',
                borderColor: '#292929',
                borderWidth: 1,
                formatter: function () {
                    const pointContext = this as any;
                    const points = pointContext.points || (pointContext.point ? [pointContext.point] : []);
                    const header = `<span style="font-size:10px">${formatDataViewerTime(pointContext.x, timeFormat, timeZone)}</span><br/>`;
                    return (
                        header +
                        points
                            .map((point: any) => `<span style="color:${point.color}">\u25cf</span> ${point.series.name}: <b>${point.y}</b><br/>`)
                            .join('')
                    );
                },
            },
            legend: {
                enabled: true,
                align: 'left',
                itemDistance: 15,
                squareSymbol: true,
                symbolRadius: 1,
                itemHoverStyle: {
                    color: '#23527c',
                    textDecoration: 'underline',
                },
                itemStyle: {
                    color: '#e7e8ea',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'normal',
                    fontFamily: 'Open Sans, Helvetica, Arial, sans-serif',
                    textOverflow: 'ellipsis',
                    textDecoration: 'none',
                },
                margin: 20,
            },
            credits: {
                enabled: false,
            },
        };
    }, [allPoints, chartSize.height, chartSize.width, series, timeFormat, timeRange, timeZone]);

    if (!options) {
        return <div className="empty-state">No numeric data on this page</div>;
    }

    return (
        <div ref={containerRef} className="data-viewer-chart">
            <HighchartsReact ref={chartRef} highcharts={Highcharts} constructorType="stockChart" options={options} />
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
    const dbName = pCode?.dbName ?? getParam(params, 'db');
    const userName = pCode?.userName ?? getParam(params, 'user');
    const tableName = pCode?.tableName ?? getParam(params, 'table');
    const tagColumn = pCode?.tagColumn || 'NAME';
    const timeColumn = pCode?.timeColumn || 'TIME';
    const valueColumn = pCode?.valueColumn || 'VALUE';
    const metaTagColumn = pCode?.metaTagColumn || tagColumn;
    const headerLabels = buildDataViewerHeaderLabels(pCode?.jobName ?? pCode?.collectorId, tableName);

    const [tags, setTags] = useState<DataViewerTag[]>([]);
    const [assetHierarchy, setAssetHierarchy] = useState<DataViewerAssetHierarchy | undefined>();
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagFilter, setTagFilter] = useState('');
    const [activeTagTab, setActiveTagTab] = useState<'tags' | 'asset'>('tags');
    const [collapsedAssetFolders, setCollapsedAssetFolders] = useState<Set<string>>(() => new Set());
    const [selectedTagName, setSelectedTagName] = useState('');
    const [mode, setMode] = useState<'raw' | 'chart'>('raw');
    const [page, setPage] = useState(1);
    const [range, setRange] = useState<DataViewerTimeRange>({ from: '', to: '' });
    const [rangeOpen, setRangeOpen] = useState(false);
    const [backwardScan, setBackwardScan] = useState(true);
    const [timeFormat, setTimeFormat] = useState(DEFAULT_TIME_FORMAT);
    const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
    const [formatOpen, setFormatOpen] = useState(false);
    const [rows, setRows] = useState<ResultRow[]>([]);
    const [chartTimeRange, setChartTimeRange] = useState<DataViewerTimeRange>({ from: '', to: '' });
    const [loading, setLoading] = useState(false);
    const [endLoading, setEndLoading] = useState(false);
    const [error, setError] = useState('');

    const visibleTags = useMemo(() => {
        return filterDataViewerTags(tags, tagFilter);
    }, [tagFilter, tags]);

    const assetRows = useMemo(() => {
        if (!assetHierarchy) return [];
        return filterVisibleAssetRows(buildAssetTreeRows(tags, assetHierarchy, tagFilter), collapsedAssetFolders);
    }, [assetHierarchy, collapsedAssetFolders, tagFilter, tags]);

    const toggleAssetFolder = useCallback((folderId: string) => {
        setCollapsedAssetFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    }, []);

    useEffect(() => {
        if (!dbName || !userName || !tableName) return;
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
                setSelectedTagName(result.tags[0]?.name ?? '');
            })
            .catch((err) => {
                if (!alive) return;
                setError(err?.message || 'Failed to load tags');
            })
            .finally(() => {
                if (alive) setTagsLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [dbName, metaTagColumn, tableName, userName]);

    const resolveEffectiveRange = useCallback(async () => {
        const nowDate = new Date();
        let lastBaseDate: Date | null | undefined;
        const resolveQueryRange = async (value: unknown) => {
            const text = String(value ?? '').trim();
            if (!text.startsWith('last')) return resolveTimeRangeInput(value, nowDate);

            if (lastBaseDate === undefined) {
                const latestTime = await queryTagBoundaryTime({
                    dbName,
                    userName,
                    tableName,
                    name: selectedTagName,
                    direction: 'latest',
                    tagColumn,
                    timeColumn,
                });
                lastBaseDate = toDataViewerDate(latestTime);
            }

            if (!lastBaseDate) return null;
            return resolveTimeRangeInput(value, lastBaseDate);
        };

        const from = await resolveQueryRange(range.from);
        const to = await resolveQueryRange(range.to);
        return { from, to };
    }, [dbName, range.from, range.to, selectedTagName, tableName, tagColumn, timeColumn, userName]);

    const fetchRows = useCallback(async () => {
        if (!dbName || !userName || !tableName || !selectedTagName) {
            setRows([]);
            setChartTimeRange({ from: '', to: '' });
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { from, to } = await resolveEffectiveRange();
            if (from === null || to === null) {
                setError('Please check the entered time.');
                setRows([]);
                setChartTimeRange({ from: '', to: '' });
                return;
            }
            if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
                setError('From should be earlier than To.');
                setRows([]);
                setChartTimeRange({ from: '', to: '' });
                return;
            }
            setChartTimeRange({ from: from || '', to: to || '' });
            const result = await queryTagData({
                dbName,
                userName,
                tableName,
                name: selectedTagName,
                direction: backwardScan ? 'latest' : 'oldest',
                from,
                to,
                page,
                pageSize: RESULT_PAGE_SIZE,
                tagColumn,
                timeColumn,
                valueColumn,
            });
            setRows(result.rows);
        } catch (err: any) {
            setRows([]);
            setChartTimeRange({ from: '', to: '' });
            setError(err?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [backwardScan, dbName, page, resolveEffectiveRange, selectedTagName, tableName, tagColumn, timeColumn, userName, valueColumn]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    useEffect(() => {
        setPage(1);
    }, [selectedTagName, range.from, range.to, backwardScan]);

    const timeRangeButtonText = formatTimeRangeLabel(range.from, range.to);
    const timeFormatButtonText = `${getTimeFormatLabel(timeFormat)} / ${getTimeZoneLabel(timeZone)}`;
    const handleEndPage = useCallback(async () => {
        if (!dbName || !userName || !tableName || !selectedTagName || endLoading) return;
        setEndLoading(true);
        setError('');
        try {
            const { from, to } = await resolveEffectiveRange();
            if (from === null || to === null) {
                setError('Please check the entered time.');
                return;
            }
            if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
                setError('From should be earlier than To.');
                return;
            }
            const result = await queryTagDataTotal({
                dbName,
                userName,
                tableName,
                name: selectedTagName,
                from,
                to,
                pageSize: RESULT_PAGE_SIZE,
                tagColumn,
                timeColumn,
            });
            const lastPage = Number(result.lastPage || 1);
            setPage(Number.isFinite(lastPage) ? Math.max(1, Math.floor(lastPage)) : 1);
        } catch (err: any) {
            setError(err?.message || 'Failed to calculate end page');
        } finally {
            setEndLoading(false);
        }
    }, [dbName, endLoading, resolveEffectiveRange, selectedTagName, tableName, tagColumn, timeColumn, userName]);
    const rawColumns = useMemo(
        () =>
            buildRawResultColumns(rows, {
                hiddenKeys: assetHierarchy ? [assetHierarchy.column || 'asset'] : [],
            }),
        [assetHierarchy, rows],
    );

    return (
        <div className={`neo-data-viewer${embedded ? ' neo-data-viewer-embedded-tab' : ''}`}>
            <header className="page-header">
                <div className="page-header-inner">
                    <div className="data-viewer-header-title">
                        <MdQueryStats className="text-primary" />
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
                                          const checked = selectedTagName === tag.name;
                                          return (
                                              <label key={`tag:${tag.name}`} className={`data-viewer-tag-row ${checked ? 'is-active' : ''}`} title={tag.name}>
                                                  <span className="node-tree-toggle">
                                                      <input type="checkbox" checked={checked} onChange={() => setSelectedTagName(tag.name)} aria-label={`${tag.name} select`} />
                                                  </span>
                                                  <span className="node-tree-label truncate">{tag.name}</span>
                                                  {tag.dataType ? <span className="badge badge-success">{tag.dataType}</span> : null}
                                              </label>
                                          );
                                      })
                                    : assetRows.map((row) => {
                                          const paddingLeft = row.depth * 16;
                                          if (row.type === 'folder') {
                                              const collapsed = collapsedAssetFolders.has(row.id);
                                              return (
                                                  <div key={row.id} className="node-tree-row node-tree-row-folder" style={{ paddingLeft }} title={row.label}>
                                                      <button type="button" className="node-tree-toggle" onClick={() => toggleAssetFolder(row.id)} aria-label={`${row.label} ${collapsed ? 'expand' : 'collapse'}`}>
                                                          {collapsed ? <VscChevronRight className="icon-sm" /> : <VscChevronDown className="icon-sm" />}
                                                      </button>
                                                      <span className="node-tree-label truncate">{row.label}</span>
                                                  </div>
                                              );
                                          }

                                          const checked = selectedTagName === row.name;
                                          return (
                                              <label
                                                  key={row.id}
                                                  className={`data-viewer-tag-row ${checked ? 'is-active' : ''}`}
                                                  style={{ paddingLeft }}
                                                  title={row.name}
                                              >
                                                  <span className="node-tree-toggle">
                                                      <input type="checkbox" checked={checked} onChange={() => setSelectedTagName(row.name)} aria-label={`${row.name} select`} />
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
                                    <div className="data-viewer-title-actions">
                                        {mode === 'raw' ? (
                                            <div className="data-viewer-scan-control" role="group" aria-label={`Scan direction: ${getScanDirectionLabel(backwardScan)}`}>
                                                <span className={`data-viewer-scan-label ${backwardScan ? 'is-active' : ''}`}>Backward</span>
                                                <button
                                                    type="button"
                                                    className={`switch data-viewer-scan-switch ${!backwardScan ? 'active' : ''}`}
                                                    onClick={() => setBackwardScan((prev) => !prev)}
                                                    aria-label={`Scan direction: ${getScanDirectionLabel(backwardScan)}`}
                                                    aria-pressed={!backwardScan}
                                                >
                                                    <div className="switch-thumb" />
                                                </button>
                                                <span className={`data-viewer-scan-label ${!backwardScan ? 'is-active' : ''}`}>Forward</span>
                                            </div>
                                        ) : null}
                                        <div className="data-viewer-query-controls">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost data-viewer-format-button"
                                                title={timeFormatButtonText}
                                                onClick={() => setFormatOpen(true)}
                                                aria-label="Set time format and timezone"
                                            >
                                                <MdPublic className="icon-sm" />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost data-viewer-time-range-button"
                                                title={timeRangeButtonText}
                                                onClick={() => setRangeOpen(true)}
                                                aria-label="Set time range"
                                            >
                                                <MdCalendarMonth className="icon-sm" />
                                                <span>{timeRangeButtonText}</span>
                                            </button>
                                        </div>
                                        <div className="log-level-group" role="tablist" aria-label="Result mode">
                                            <button type="button" className={`log-level-item ${mode === 'raw' ? 'is-included' : 'is-excluded'}`} onClick={() => setMode('raw')}>
                                                Raw
                                            </button>
                                            <button type="button" className={`log-level-item ${mode === 'chart' ? 'is-included' : 'is-excluded'}`} onClick={() => setMode('chart')}>
                                                Chart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {error ? <div className="error-box">{error}</div> : null}
                            {!selectedTagName && !error ? <div className="empty-state">Database table and tag are required</div> : null}
                            {selectedTagName && mode === 'raw' ? (
                                <div className="table-card data-viewer-raw-card">
                                    <div className="table-card-body">
                                        <table className="table-clean data-viewer-raw-table">
	                                            <thead>
	                                                <tr>
	                                                    {rawColumns.map((column) => (
	                                                        <th key={column.key}>{column.label}</th>
	                                                    ))}
	                                                </tr>
	                                            </thead>
	                                            <tbody>
	                                                {rows.map((row, index) => (
	                                                    <tr key={`${row.time}-${index}`}>
	                                                        {rawColumns.map((column) => (
	                                                            <td key={column.key} className="mono">
	                                                                {column.key === 'time' ? formatDataViewerTime(row[column.key], timeFormat, timeZone) : String(row[column.key] ?? '')}
	                                                            </td>
	                                                        ))}
	                                                    </tr>
	                                                ))}
                                            </tbody>
                                        </table>
                                        {loading ? <div className="empty-state">Loading...</div> : null}
                                        {!loading && rows.length === 0 ? <div className="empty-state">No data</div> : null}
                                    </div>
                                    <ResultPagination page={page} pageSize={RESULT_PAGE_SIZE} rowCount={rows.length} loading={loading} endLoading={endLoading} onPage={setPage} onEndPage={handleEndPage} />
                                </div>
                            ) : null}
                            {selectedTagName && mode === 'chart' ? (
                                <div className="table-card data-viewer-chart-card">
                                    <div className="table-card-body">
                                        {loading ? <div className="empty-state">Loading...</div> : <TagLineChart rows={rows} timeFormat={timeFormat} timeZone={timeZone} timeRange={chartTimeRange} />}
                                    </div>
                                    <ResultPagination page={page} pageSize={RESULT_PAGE_SIZE} rowCount={rows.length} loading={loading} endLoading={endLoading} onPage={setPage} onEndPage={handleEndPage} />
                                </div>
                            ) : null}
                        </section>
                    </div>
                </div>
            </main>

            {rangeOpen ? (
                <TimeRangeModal
                    range={range}
                    onClose={() => setRangeOpen(false)}
                    onApply={(next) => {
                        setRange(next);
                        setRangeOpen(false);
                    }}
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
