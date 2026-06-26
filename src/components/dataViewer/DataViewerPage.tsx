import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as echarts from 'echarts';
import { useSetRecoilState } from 'recoil';
import {
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
    VscChevronDown,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import NeoTimeRangeModal from '@/components/modal/TimeRangeModal';
import { TimeZoneModal as NeoTimeZoneModal } from '@/components/modal/TimeZoneModal';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { createTagAnalyzerBoardFromPayload } from '@/components/tagAnalyzer/bridge/createTagAnalyzerBoardFromTagSet';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import { DataViewerAssetHierarchy, DataViewerTag, listTableTags, queryTagBoundaryTime, queryTagChartData, queryTagData, queryTagDataTotal } from './dataViewerApi';
import {
    DEFAULT_TIME_FORMAT,
    DEFAULT_TIME_ZONE,
    buildAssetTreeRows,
    buildDataViewerChartGroups,
    buildDataViewerEChartOption,
    buildDataViewerHeaderLabels,
    buildDataViewerSplitGroups,
    buildDataViewerWheelZoomRange,
    buildDataViewerZoomControlRange,
    buildRawResultColumns,
    extractDataViewerDataZoomRange,
    filterDataViewerTags,
    filterVisibleAssetRows,
    formatDataViewerTime,
    formatTimeRangeLabel,
    getDataViewerChartRangeMs,
    getTimeFormatLabel,
    getTimeZoneLabel,
    hasExplicitDataViewerDataZoomEventRange,
    isSameDataViewerChartRange,
    normalizeSelectedTagNames,
    resolveTimeRangeInput,
    toggleSelectedTagName,
    toDataViewerDate,
} from './dataViewerModel';
import './DataViewerPage.scss';

const RESULT_PAGE_SIZE = 100;

type ResultRow = Record<string, unknown>;
type DataViewerTimeRange = { from: string | number; to: string | number };

const getParam = (params: URLSearchParams, key: string) => params.get(key)?.trim() ?? '';

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

function TagEChart({
    series,
    timeFormat,
    timeZone,
    timeRange,
    displayRange,
    onDisplayRangeChange,
}: {
    series: Array<{ name: string; data: Array<[number, number | null]> }>;
    timeFormat: string;
    timeZone: string;
    timeRange: DataViewerTimeRange;
    displayRange?: DataViewerTimeRange;
    onDisplayRangeChange?: (range: DataViewerTimeRange) => void;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);
    const rangeRef = useRef({ currentRange: {}, navigatorRange: {}, onDisplayRangeChange });
    const allPoints = useMemo(() => series.flatMap((item) => item.data), [series]);
    const options = useMemo(() => buildDataViewerEChartOption({ series, timeFormat, timeZone, timeRange, displayRange }), [displayRange, series, timeFormat, timeRange, timeZone]);
    const currentRange = useMemo(() => getDataViewerChartRangeMs(allPoints, displayRange || timeRange), [allPoints, displayRange, timeRange]);
    const navigatorRange = useMemo(() => getDataViewerChartRangeMs(allPoints, {}), [allPoints]);

    useEffect(() => {
        rangeRef.current = { currentRange, navigatorRange, onDisplayRangeChange };
    }, [currentRange, navigatorRange, onDisplayRangeChange]);

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
        const convertMouseEventToTimestamp = (event: WheelEvent) => {
            const rect = container.getBoundingClientRect?.();
            if (!rect) return undefined;
            const pixel = [event.clientX - rect.left, event.clientY - rect.top];
            if (!chart.containPixel?.({ gridIndex: 0 }, pixel)) return undefined;
            const fromAxis = chart.convertFromPixel?.({ xAxisIndex: 0 }, pixel);
            const fromGrid = chart.convertFromPixel?.({ gridIndex: 0 }, pixel);
            const axisTime = Array.isArray(fromAxis) ? Number(fromAxis[0]) : Number(fromAxis);
            if (Number.isFinite(axisTime)) return axisTime;
            const gridTime = Array.isArray(fromGrid) ? Number(fromGrid[0]) : Number(fromGrid);
            if (Number.isFinite(gridTime)) return gridTime;
            const { currentRange: activeRange } = rangeRef.current as any;
            const start = Number(activeRange?.startTime);
            const end = Number(activeRange?.endTime);
            return Number.isFinite(start) && Number.isFinite(end) ? start + (end - start) / 2 : undefined;
        };
        const handleMouseWheelZoom = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            const { currentRange: activeRange, navigatorRange: activeNavigatorRange, onDisplayRangeChange: activeRangeChange } = rangeRef.current as any;
            const anchorTime = convertMouseEventToTimestamp(event);
            const nextRange = buildDataViewerWheelZoomRange(event.deltaY, anchorTime, activeRange, activeNavigatorRange);
            if (!nextRange || isSameDataViewerChartRange(nextRange, activeRange)) return;
            event.preventDefault();
            event.stopPropagation();
            activeRangeChange?.({ from: new Date(nextRange.startTime).toISOString(), to: new Date(nextRange.endTime).toISOString() });
        };
        const handleDataZoom = (params: any) => {
            const { currentRange: activeRange, navigatorRange: activeNavigatorRange, onDisplayRangeChange: activeRangeChange } = rangeRef.current as any;
            const dataZoomState = getDataZoomEventState(params);
            const nextRange = hasExplicitDataViewerDataZoomEventRange(params)
                ? extractDataViewerDataZoomRange(params, activeRange, activeNavigatorRange)
                : extractDataViewerDataZoomRange(dataZoomState, activeRange, activeNavigatorRange);
            if (!nextRange || isSameDataViewerChartRange(nextRange, activeRange)) return;
            activeRangeChange?.({ from: new Date(nextRange.startTime).toISOString(), to: new Date(nextRange.endTime).toISOString() });
        };
        chart.on('datazoom', handleDataZoom);
        container.addEventListener('wheel', handleMouseWheelZoom, { passive: false, capture: true });

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
            if (observer) observer.disconnect();
            else window.removeEventListener('resize', resize);
            chart.dispose();
            chartRef.current = null;
        };
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
            onDisplayRangeChange?.({ from: new Date(nextRange.startTime).toISOString(), to: new Date(nextRange.endTime).toISOString() });
        },
        [currentRange, navigatorRange, onDisplayRangeChange],
    );

    const zoomControlsDisabled =
        !Number.isFinite(currentRange.startTime) || !Number.isFinite(currentRange.endTime) || !Number.isFinite(navigatorRange.startTime) || !Number.isFinite(navigatorRange.endTime);

    if (allPoints.length === 0) return <div className="empty-state">No chart data</div>;

    return (
        <div className="data-viewer-chart-shell">
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
                className="data-viewer-chart"
                data-display-from={Number.isFinite(currentRange.startTime) ? String(Math.floor(Number(currentRange.startTime))) : ''}
                data-display-to={Number.isFinite(currentRange.endTime) ? String(Math.ceil(Number(currentRange.endTime))) : ''}
                data-navigator-from={Number.isFinite(navigatorRange.startTime) ? String(Math.floor(Number(navigatorRange.startTime))) : ''}
                data-navigator-to={Number.isFinite(navigatorRange.endTime) ? String(Math.ceil(Number(navigatorRange.endTime))) : ''}
            />
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
    const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
    const [mode, setMode] = useState<'raw' | 'chart'>('raw');
    const [page, setPage] = useState(1);
    const [range, setRange] = useState<DataViewerTimeRange>({ from: '', to: '' });
    const [rangeEditor, setRangeEditor] = useState<{ type: 'global' } | { type: 'split'; groupId: string } | null>(null);
    const [splitChartGroups, setSplitChartGroups] = useState<Array<{ id: string; title: string; tagNames: string[] }>>([]);
    const [splitChartRanges, setSplitChartRanges] = useState<Record<string, DataViewerTimeRange>>({});
    const [chartViewRanges, setChartViewRanges] = useState<Record<string, DataViewerTimeRange>>({});
    const [chartResults, setChartResults] = useState<Record<string, { range: DataViewerTimeRange; series: Array<{ name: string; data: Array<[number, number | null]> }> }>>({});
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState('');
    const [backwardScan, setBackwardScan] = useState(true);
    const [timeFormat, setTimeFormat] = useState(DEFAULT_TIME_FORMAT);
    const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
    const [formatOpen, setFormatOpen] = useState(false);
    const [rows, setRows] = useState<ResultRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [endLoading, setEndLoading] = useState(false);
    const [error, setError] = useState('');
    const rowsRequestRef = useRef(0);
    const chartRequestRef = useRef(0);
    const endPageRequestRef = useRef(0);
    const selectedTagKey = selectedTagNames.join('\n');

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
    const canQuery = Boolean(dbName && userName && tableName && selectedTagNames.length > 0);
    const chartGroups = useMemo(
        () =>
            buildDataViewerChartGroups({
                selectedTagNames,
                splitGroups: splitChartGroups,
                globalRange: range,
                splitRanges: splitChartRanges,
            }),
        [range, selectedTagNames, splitChartGroups, splitChartRanges],
    );
    const splitAssignedNames = useMemo(() => new Set(splitChartGroups.flatMap((group) => group.tagNames || [])), [splitChartGroups]);

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
            setPage(1);
        }
    }, [selectableRows, selectedTagKey, selectedTagNames]);

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
        setSplitChartRanges((current) => {
            const next: Record<string, DataViewerTimeRange> = {};
            Object.entries(current).forEach(([id, value]) => {
                if (validGroupIds.has(id)) next[id] = value;
            });
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
    }, [chartGroups]);

    const handleTagSelectionChange = useCallback((tagName: string) => {
        rowsRequestRef.current += 1;
        chartRequestRef.current += 1;
        endPageRequestRef.current += 1;
        setChartViewRanges({});
        setSelectedTagNames((current) => toggleSelectedTagName(current, tagName));
        setPage(1);
    }, []);

    const handleCreateSplitChart = useCallback(
        (tagNames: string[]) => {
            const nextGroups = buildDataViewerSplitGroups({
                tagNames,
                selectedTagNames,
                assignedTagNames: Array.from(splitAssignedNames),
            });
            if (nextGroups.length === 0) return;
            chartRequestRef.current += 1;
            setChartViewRanges({});
            setSplitChartGroups((current) => [...current, ...nextGroups]);
        },
        [selectedTagNames, splitAssignedNames],
    );

    const handleMergeSplitChart = useCallback((groupId: string) => {
        chartRequestRef.current += 1;
        setChartViewRanges({});
        setSplitChartGroups((current) => current.filter((group) => group.id !== groupId));
        setSplitChartRanges((current) => {
            if (!Object.prototype.hasOwnProperty.call(current, groupId)) return current;
            const next = { ...current };
            delete next[groupId];
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
                setSelectedTagNames(result.tags[0]?.name ? [result.tags[0].name] : []);
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
                    names: selectedTagNames,
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
    }, [dbName, range.from, range.to, selectedTagNames, tableName, tagColumn, timeColumn, userName]);

    const fetchRows = useCallback(async () => {
        const requestId = rowsRequestRef.current + 1;
        rowsRequestRef.current = requestId;
        if (!canQuery || mode !== 'raw') {
            setRows([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { from, to } = await resolveEffectiveRange();
            if (from === null || to === null) {
                if (rowsRequestRef.current !== requestId) return;
                setError('Please check the entered time.');
                setRows([]);
                return;
            }
            if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
                if (rowsRequestRef.current !== requestId) return;
                setError('From should be earlier than To.');
                setRows([]);
                return;
            }
            const result = await queryTagData({
                dbName,
                userName,
                tableName,
                names: selectedTagNames,
                direction: backwardScan ? 'latest' : 'oldest',
                from,
                to,
                page,
                pageSize: RESULT_PAGE_SIZE,
                tagColumn,
                timeColumn,
                valueColumn,
            });
            if (rowsRequestRef.current !== requestId) return;
            setRows(result.rows);
        } catch (err: any) {
            if (rowsRequestRef.current !== requestId) return;
            setRows([]);
            setError(err?.message || 'Failed to load data');
        } finally {
            if (rowsRequestRef.current === requestId) setLoading(false);
        }
    }, [backwardScan, canQuery, dbName, mode, page, resolveEffectiveRange, selectedTagNames, tableName, tagColumn, timeColumn, userName, valueColumn]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    useEffect(() => {
        setPage(1);
    }, [selectedTagKey, range.from, range.to, backwardScan]);

    useEffect(() => {
        const requestId = chartRequestRef.current + 1;
        chartRequestRef.current = requestId;

        if (!canQuery || mode !== 'chart') {
            setChartResults({});
            setChartError('');
            setChartLoading(false);
            return undefined;
        }

        let alive = true;
        const fetchCharts = async () => {
            setChartLoading(true);
            setChartError('');
            try {
                const baseDate = new Date();
                const nextResults: Record<string, { range: DataViewerTimeRange; series: Array<{ name: string; data: Array<[number, number | null]> }> }> = {};
                await Promise.all(
                    chartGroups.map(async (group) => {
                        const queryFrom = resolveTimeRangeInput(group.range?.from, baseDate);
                        const queryTo = resolveTimeRangeInput(group.range?.to, baseDate);
                        if (queryFrom === null || queryTo === null) throw new Error('Please check the entered time.');
                        if (queryFrom && queryTo && new Date(queryFrom).getTime() > new Date(queryTo).getTime()) throw new Error('From should be earlier than To.');
                        const data = await queryTagChartData({
                            dbName,
                            userName,
                            tableName,
                            names: group.tagNames,
                            from: queryFrom,
                            to: queryTo,
                            tagColumn,
                            timeColumn,
                            valueColumn,
                        });
                        nextResults[group.id] = {
                            range: { from: queryFrom || '', to: queryTo || '' },
                            series: data?.series || [],
                        };
                    }),
                );
                if (!alive || chartRequestRef.current !== requestId) return;
                setChartResults(nextResults);
            } catch (err: any) {
                if (!alive || chartRequestRef.current !== requestId) return;
                setChartError(err?.message || 'Failed to load chart data');
                setChartResults({});
            } finally {
                if (alive && chartRequestRef.current === requestId) setChartLoading(false);
            }
        };

        fetchCharts();
        return () => {
            alive = false;
        };
    }, [canQuery, chartGroups, dbName, mode, tableName, tagColumn, timeColumn, userName, valueColumn]);

    const timeRangeButtonText = formatTimeRangeLabel(range.from, range.to);
    const timeFormatButtonText = `${getTimeFormatLabel(timeFormat)} / ${getTimeZoneLabel(timeZone)}`;
    const handleEndPage = useCallback(async () => {
        if (!canQuery || endLoading) return;
        const requestId = endPageRequestRef.current + 1;
        endPageRequestRef.current = requestId;
        setEndLoading(true);
        setError('');
        try {
            const { from, to } = await resolveEffectiveRange();
            if (from === null || to === null) {
                if (endPageRequestRef.current !== requestId) return;
                setError('Please check the entered time.');
                return;
            }
            if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
                if (endPageRequestRef.current !== requestId) return;
                setError('From should be earlier than To.');
                return;
            }
            const result = await queryTagDataTotal({
                dbName,
                userName,
                tableName,
                names: selectedTagNames,
                from,
                to,
                pageSize: RESULT_PAGE_SIZE,
                tagColumn,
                timeColumn,
            });
            if (endPageRequestRef.current !== requestId) return;
            const lastPage = Number(result.lastPage || 1);
            setPage(Number.isFinite(lastPage) ? Math.max(1, Math.floor(lastPage)) : 1);
        } catch (err: any) {
            if (endPageRequestRef.current !== requestId) return;
            setError(err?.message || 'Failed to calculate end page');
        } finally {
            if (endPageRequestRef.current === requestId) setEndLoading(false);
        }
    }, [canQuery, dbName, endLoading, resolveEffectiveRange, selectedTagNames, tableName, tagColumn, timeColumn, userName]);
    const rawColumns = useMemo(
        () =>
            buildRawResultColumns(rows, {
                hiddenKeys: assetHierarchy ? [assetHierarchy.column || 'asset'] : [],
            }),
        [assetHierarchy, rows],
    );
    const handleRangeApply = useCallback(
        (next: DataViewerTimeRange) => {
            rowsRequestRef.current += 1;
            chartRequestRef.current += 1;
            endPageRequestRef.current += 1;
            setChartViewRanges({});
            if (rangeEditor?.type === 'split' && rangeEditor.groupId) {
                setSplitChartRanges((current) => ({
                    ...current,
                    [rangeEditor.groupId]: next,
                }));
            } else {
                setRange(next);
            }
            setPage(1);
            setRangeEditor(null);
        },
        [rangeEditor],
    );
    const handleOpenTagAnalyzer = useCallback(
        (
            group: { id: string; title: string; tagNames: string[]; range: { from?: unknown; to?: unknown } },
            chartData?: { range?: DataViewerTimeRange },
        ) => {
            const tazRange = chartViewRanges[group.id] || chartData?.range || group.range;
            const rangeFrom = typeof tazRange?.from === 'string' || typeof tazRange?.from === 'number' ? tazRange.from : '';
            const rangeTo = typeof tazRange?.to === 'string' || typeof tazRange?.to === 'number' ? tazRange.to : '';
            const payload = {
                title: group.title || 'Data Viewer',
                range:
                    rangeFrom && rangeTo
                        ? {
                              startIso: new Date(rangeFrom).toISOString(),
                              endIso: new Date(rangeTo).toISOString(),
                          }
                        : undefined,
                tags: group.tagNames.map((tagName) => ({
                    tagName,
                    table: `${dbName}.${userName}.${tableName}`,
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1,
                    colName: {
                        name: tagColumn,
                        time: timeColumn,
                        value: valueColumn,
                        timeType: 6,
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
        [chartViewRanges, dbName, setBoardList, setSelectedTab, tableName, tagColumn, timeColumn, userName, valueColumn],
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

                                          const checked = selectedTagNames.includes(row.name);
                                          return (
                                              <label
                                                  key={row.id}
                                                  className={`data-viewer-tag-row ${checked ? 'is-active' : ''}`}
                                                  style={{ paddingLeft }}
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
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost data-viewer-format-button"
                                                title={timeFormatButtonText}
                                                onClick={() => setFormatOpen(true)}
                                                aria-label="Set time format and timezone"
                                            >
                                                <MaterialIcon name="public" className="icon-sm" />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost data-viewer-time-range-button"
                                                title={timeRangeButtonText}
                                                onClick={() => setRangeEditor({ type: 'global' })}
                                                aria-label="Set time range"
                                            >
                                                <MaterialIcon name="calendar_month" className="icon-sm" />
                                                <span>{timeRangeButtonText}</span>
                                            </button>
                                        </div>
                                        <div className="data-viewer-segmented data-viewer-mode-control" role="tablist" aria-label="Result mode">
                                            <button type="button" role="tab" aria-selected={mode === 'raw'} className={`data-viewer-segmented-item ${mode === 'raw' ? 'is-active' : ''}`} onClick={() => setMode('raw')}>
                                                Raw
                                            </button>
                                            <button type="button" role="tab" aria-selected={mode === 'chart'} className={`data-viewer-segmented-item ${mode === 'chart' ? 'is-active' : ''}`} onClick={() => setMode('chart')}>
                                                Chart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {error ? <div className="error-box">{error}</div> : null}
                            {!canQuery && !error ? <div className="empty-state">Database table and tag are required</div> : null}
                            {canQuery && mode === 'raw' ? (
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
                            {canQuery && mode === 'chart' ? (
                                <div className="data-viewer-chart-stack">
                                    {chartError ? <div className="error-box">{chartError}</div> : null}
                                    {chartLoading ? <div className="empty-state">Loading...</div> : null}
                                    {!chartLoading &&
                                        chartGroups.map((group) => {
                                            const chartData = chartResults[group.id] || { series: [], range: group.range as DataViewerTimeRange };
                                            return (
                                                <div key={group.id} className="table-card data-viewer-chart-card">
                                                    <div className="data-viewer-chart-panel-header">
                                                        <div className="data-viewer-chart-panel-title">
                                                            <MaterialIcon name={group.split ? 'call_split' : 'query_stats'} className="icon-sm text-primary" />
                                                            <span className="truncate">{group.title}</span>
                                                            <span className="badge badge-muted">{group.tagNames.length}</span>
                                                        </div>
                                                        <div className="data-viewer-chart-panel-actions">
                                                            <button type="button" className="btn btn-sm btn-ghost" title="Open in Tag Analyzer" onClick={() => handleOpenTagAnalyzer(group, chartData)}>
                                                                <MaterialIcon name="monitoring" className="icon-sm" />
                                                                <span>Tag Analyzer</span>
                                                            </button>
                                                            {group.split ? (
                                                                <>
                                                                    <button type="button" className="btn btn-sm btn-ghost" title="Group" onClick={() => handleMergeSplitChart(group.id)}>
                                                                        <MaterialIcon name="join_inner" className="icon-sm" />
                                                                        <span>Group</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-ghost data-viewer-time-range-button"
                                                                        title={formatTimeRangeLabel(group.range?.from, group.range?.to)}
                                                                        onClick={() => setRangeEditor({ type: 'split', groupId: group.id })}
                                                                    >
                                                                        <MaterialIcon name="calendar_month" className="icon-sm" />
                                                                        <span>{formatTimeRangeLabel(group.range?.from, group.range?.to)}</span>
                                                                    </button>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="table-card-body">
                                                        {!group.split && group.tagNames.length > 0 && (group.tagNames.length > 1 || splitChartGroups.length > 0) ? (
                                                            <div className="data-viewer-chart-tag-actions" aria-label="Split individual tags">
                                                                {group.tagNames.map((tagName) => (
                                                                    <button key={tagName} type="button" className="data-viewer-chart-tag-chip" title={`Split ${tagName}`} onClick={() => handleCreateSplitChart([tagName])}>
                                                                        <span className="truncate">{tagName}</span>
                                                                        <MaterialIcon name="call_split" className="icon-sm" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                        <TagEChart
                                                            series={chartData.series}
                                                            timeFormat={timeFormat}
                                                            timeZone={timeZone}
                                                            timeRange={chartData.range}
                                                            displayRange={chartViewRanges[group.id]}
                                                            onDisplayRangeChange={(nextRange) => {
                                                                setChartViewRanges((current) => ({
                                                                    ...current,
                                                                    [group.id]: nextRange,
                                                                }));
                                                            }}
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

            {rangeEditor ? (
                <TimeRangeModal
                    range={rangeEditor.type === 'split' ? splitChartRanges[rangeEditor.groupId] || range : range}
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
