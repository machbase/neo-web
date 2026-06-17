import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Highcharts from 'highcharts/highstock';
import HighchartsBoost from 'highcharts/modules/boost';
import HighchartsReact from 'highcharts-react-official';
import {
    ArrowLeft,
    MdCalendarMonth,
    Close,
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { MdPublic, MdQueryStats } from 'react-icons/md';
import { DataViewerTag, listTableTags, queryTagData } from './dataViewerApi';
import {
    DEFAULT_TIME_FORMAT,
    DEFAULT_TIME_ZONE,
    QUICK_TIME_RANGE_GROUPS,
    TIME_FORMATS,
    TIME_ZONE_OPTIONS,
    buildTagChartSeries,
    buildDataViewerHeaderLabels,
    formatDataViewerTime,
    formatTimeRangeLabel,
    getScanDirectionLabel,
    getTimeFormatLabel,
    getTimeZoneLabel,
    resolveTimeRangeInput,
} from './dataViewerModel';
import './DataViewerPage.scss';

const applyHighchartsBoost = HighchartsBoost as unknown as ((highcharts: typeof Highcharts) => void) | undefined;
if (typeof applyHighchartsBoost === 'function') {
    applyHighchartsBoost(Highcharts);
}

const RESULT_PAGE_SIZE = 100;
const MIN_CHART_HEIGHT = 260;
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ResultRow = Record<string, unknown>;
type PickerTarget = 'from' | 'to';
type PickerState = {
    target: PickerTarget;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    position: { top: number; left: number };
};

const getParam = (params: URLSearchParams, key: string) => params.get(key)?.trim() ?? '';

const padDatePart = (value: number) => String(value).padStart(2, '0');

const clampTimePart = (value: string, min: number, max: number) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return min;
    return Math.min(Math.max(Math.floor(next), min), max);
};

const getPickerParts = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
        return {
            year: Number(match[1]),
            month: Number(match[2]) - 1,
            day: Number(match[3]),
            hour: Number(match[4]),
            minute: Number(match[5]),
            second: Number(match[6] || '0'),
        };
    }

    const fallback = new Date();
    return {
        year: fallback.getFullYear(),
        month: fallback.getMonth(),
        day: fallback.getDate(),
        hour: fallback.getHours(),
        minute: fallback.getMinutes(),
        second: fallback.getSeconds(),
    };
};

const formatPickerParts = (parts: PickerState) =>
    `${parts.year}-${padDatePart(parts.month + 1)}-${padDatePart(parts.day)} ${padDatePart(parts.hour)}:${padDatePart(parts.minute)}:${padDatePart(parts.second)}`;

const buildCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(day);
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    return cells;
};

function ResultPagination({
    page,
    rowCount,
    loading,
    onPage,
}: {
    page: number;
    rowCount: number;
    loading: boolean;
    onPage: (page: number) => void;
}) {
    const [value, setValue] = useState(String(page));
    const hasNextPage = rowCount >= RESULT_PAGE_SIZE;

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
            <button type="button" className="btn btn-sm btn-ghost" disabled={!hasNextPage || loading} onClick={() => go(page + 1)} aria-label="Next page">
                <VscChevronRight className="icon-sm" />
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={!hasNextPage || loading} onClick={() => go(page + 1)} aria-label="Forward page">
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
    range: { from: string; to: string };
    onApply: (range: { from: string; to: string }) => void;
    onClose: () => void;
}) {
    const [from, setFrom] = useState(range.from);
    const [to, setTo] = useState(range.to);
    const [error, setError] = useState('');
    const [picker, setPicker] = useState<PickerState | null>(null);

    const handleQuickRange = (option: (typeof QUICK_TIME_RANGE_GROUPS)[number][number]) => {
        setFrom(option.value[0]);
        setTo(option.value[1]);
        setError('');
        setPicker(null);
    };

    const openDatePicker = (target: PickerTarget, event: MouseEvent<HTMLButtonElement>) => {
        const sourceValue = target === 'from' ? from : to;
        const parts = getPickerParts(sourceValue);
        const rect = event.currentTarget.parentElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
        const popoverWidth = 560;
        const popoverHeight = 420;
        const top = Math.min(Math.max(16, rect.bottom + 32), Math.max(16, window.innerHeight - popoverHeight - 16));
        const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - popoverWidth - 16));

        setPicker({
            target,
            ...parts,
            position: { top, left },
        });
    };

    const setPickerPart = (key: 'hour' | 'minute' | 'second', value: string) => {
        setPicker((prev) => {
            if (!prev) return prev;
            const next = { ...prev };

            if (key === 'hour') next.hour = clampTimePart(value, 0, 23);
            if (key === 'minute') next.minute = clampTimePart(value, 0, 59);
            if (key === 'second') next.second = clampTimePart(value, 0, 59);

            return next;
        });
    };

    const movePickerMonth = (amount: number) => {
        setPicker((prev) => {
            if (!prev) return prev;
            const nextDate = new Date(prev.year, prev.month + amount, 1);
            const daysInNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            return {
                ...prev,
                year: nextDate.getFullYear(),
                month: nextDate.getMonth(),
                day: Math.min(prev.day, daysInNextMonth),
            };
        });
    };

    const choosePickerDay = (day: number) => {
        setPicker((prev) => (prev ? { ...prev, day } : prev));
    };

    const applyPicker = () => {
        if (!picker) return;
        const nextValue = formatPickerParts(picker);

        if (picker.target === 'from') setFrom(nextValue);
        else setTo(nextValue);

        setError('');
        setPicker(null);
    };

    const apply = () => {
        const baseDate = new Date();
        const nextFrom = resolveTimeRangeInput(from, baseDate);
        const nextTo = resolveTimeRangeInput(to, baseDate);
        if (nextFrom === null || nextTo === null) {
            setError('Please check the entered time.');
            return;
        }
        if (new Date(nextFrom).getTime() > new Date(nextTo).getTime()) {
            setError('From should be earlier than To.');
            return;
        }
        onApply({ from: from.trim(), to: to.trim() });
    };

    return (
        <div className="modal-overlay data-viewer-time-overlay">
            <div className="modal modal-md data-viewer-time-modal animate-fade-in">
                <div className="modal-header">
                    <div className="modal-header-title">
                        <MdCalendarMonth className="icon-sm text-primary" />
                        <span>Time Range</span>
                    </div>
                    <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Close">
                        <Close className="icon-sm" />
                    </button>
                </div>

                <div className="modal-body data-viewer-time-body">
                    <div className="data-viewer-time-fields">
                        <label className="data-viewer-time-field">
                            <span>From</span>
                            <div className="input-icon-wrap">
                                <input
                                    type="text"
                                    value={from}
                                    onChange={(event) => {
                                        setFrom(event.target.value);
                                        setError('');
                                    }}
                                    placeholder="YYYY-MM-DD HH:mm:ss"
                                />
                                <button type="button" className="data-viewer-date-icon-button" aria-label="Open date picker" onClick={(event) => openDatePicker('from', event)}>
                                    <MdCalendarMonth className="icon-sm" />
                                </button>
                            </div>
                        </label>
                        <label className="data-viewer-time-field">
                            <span>To</span>
                            <div className="input-icon-wrap">
                                <input
                                    type="text"
                                    value={to}
                                    onChange={(event) => {
                                        setTo(event.target.value);
                                        setError('');
                                    }}
                                    placeholder="YYYY-MM-DD HH:mm:ss"
                                />
                                <button type="button" className="data-viewer-date-icon-button" aria-label="Open date picker" onClick={(event) => openDatePicker('to', event)}>
                                    <MdCalendarMonth className="icon-sm" />
                                </button>
                            </div>
                        </label>
                    </div>
                    {error ? <div className="error-box">{error}</div> : null}
                    <div className="data-viewer-quick-range">
                        <div className="data-viewer-quick-range-title">Quick Range</div>
                        <div className="data-viewer-quick-range-grid">
                            {QUICK_TIME_RANGE_GROUPS.map((group, groupIndex) => (
                                <div key={groupIndex} className="data-viewer-quick-range-group">
                                    {group.map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            className="data-viewer-quick-range-button"
                                            onClick={() => handleQuickRange(option)}
                                        >
                                            {option.name}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    {picker ? (
                        <div className="data-viewer-date-picker-popover" style={{ top: picker.position.top, left: picker.position.left }}>
                            <div className="data-viewer-date-picker-content">
                                <div className="data-viewer-date-picker-form">
                                    <div className="data-viewer-date-picker-calendar">
                                        <div className="data-viewer-date-picker-calendar-header">
                                            <button type="button" className="btn-icon-sm" onClick={() => movePickerMonth(-1)}>
                                                <VscChevronLeft className="icon-sm" />
                                            </button>
                                            <span>{`${MONTH_LABELS[picker.month]} ${picker.year}`}</span>
                                            <button type="button" className="btn-icon-sm" onClick={() => movePickerMonth(1)}>
                                                <VscChevronRight className="icon-sm" />
                                            </button>
                                        </div>
                                        <div className="data-viewer-date-picker-weekdays">
                                            {WEEKDAY_LABELS.map((label, index) => (
                                                <span key={`${label}-${index}`}>{label}</span>
                                            ))}
                                        </div>
                                        <div className="data-viewer-date-picker-days">
                                            {buildCalendarDays(picker.year, picker.month).map((day, index) =>
                                                day ? (
                                                    <button
                                                        key={`${picker.year}-${picker.month}-${day}`}
                                                        type="button"
                                                        className={`data-viewer-date-picker-day${day === picker.day ? ' is-selected' : ''}`}
                                                        onClick={() => choosePickerDay(day)}
                                                    >
                                                        {day}
                                                    </button>
                                                ) : (
                                                    <span key={`empty-${index}`} />
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="data-viewer-date-picker-time">
                                        <label>
                                            <span>Hour</span>
                                            <input type="number" min="0" max="23" value={padDatePart(picker.hour)} onChange={(event) => setPickerPart('hour', event.target.value)} />
                                        </label>
                                        <label>
                                            <span>Minute</span>
                                            <input type="number" min="0" max="59" value={padDatePart(picker.minute)} onChange={(event) => setPickerPart('minute', event.target.value)} />
                                        </label>
                                        <label>
                                            <span>Second</span>
                                            <input type="number" min="0" max="59" value={padDatePart(picker.second)} onChange={(event) => setPickerPart('second', event.target.value)} />
                                        </label>
                                    </div>
                                </div>
                                <div className="data-viewer-date-picker-actions">
                                    <button type="button" className="btn btn-primary" onClick={applyPicker}>
                                        Apply
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setPicker(null)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-primary" onClick={apply}>
                        Apply
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
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
    const [nextFormat, setNextFormat] = useState(timeFormat);
    const [nextZone, setNextZone] = useState(timeZone);

    return (
        <div className="modal-overlay data-viewer-time-overlay">
            <div className="modal modal-md data-viewer-time-modal data-viewer-format-modal animate-fade-in">
                <div className="modal-header">
                    <div className="modal-header-title">
                        <MdPublic className="icon-sm text-primary" />
                        <span>Format &amp; Timezone</span>
                    </div>
                    <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Close">
                        <Close className="icon-sm" />
                    </button>
                </div>

                <div className="modal-body data-viewer-format-body">
                    <div className="data-viewer-format-fields">
                        <label className="data-viewer-select-field">
                            <span>Time format</span>
                            <select value={nextFormat} onChange={(event) => setNextFormat(event.target.value)}>
                                {TIME_FORMATS.map((format) => (
                                    <option key={format.value} value={format.value}>
                                        {format.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="data-viewer-select-field">
                            <span>Time zone</span>
                            <select value={nextZone} onChange={(event) => setNextZone(event.target.value)}>
                                {TIME_ZONE_OPTIONS.map((zone) => (
                                    <option key={zone.value} value={zone.value}>
                                        {zone.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-primary" onClick={() => onApply({ timeFormat: nextFormat, timeZone: nextZone })}>
                        Apply
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function TagLineChart({ rows, timeFormat, timeZone }: { rows: ResultRow[]; timeFormat: string; timeZone: string }) {
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

        const xValues = allPoints.map((point) => point[0]);
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
                zoomType: 'x',
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
                min: Math.min(...xValues),
                max: Math.max(...xValues),
                crosshair: {
                    snap: false,
                    width: 0.5,
                    color: 'red',
                },
                labels: {
                    align: 'center',
                    formatter: function () {
                        return formatDataViewerTime(this.value, timeFormat, timeZone);
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
    }, [allPoints, chartSize.height, chartSize.width, series, timeFormat, timeZone]);

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
    const navigate = useNavigate();
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
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagFilter, setTagFilter] = useState('');
    const [selectedTagName, setSelectedTagName] = useState('');
    const [mode, setMode] = useState<'raw' | 'chart'>('raw');
    const [page, setPage] = useState(1);
    const [range, setRange] = useState({ from: '', to: '' });
    const [rangeOpen, setRangeOpen] = useState(false);
    const [backwardScan, setBackwardScan] = useState(true);
    const [timeFormat, setTimeFormat] = useState(DEFAULT_TIME_FORMAT);
    const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
    const [formatOpen, setFormatOpen] = useState(false);
    const [rows, setRows] = useState<ResultRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const visibleTags = useMemo(() => {
        const q = tagFilter.trim().toLowerCase();
        if (!q) return tags;
        return tags.filter((tag) => tag.name.toLowerCase().includes(q) || tag.dataType?.toLowerCase().includes(q));
    }, [tagFilter, tags]);

    useEffect(() => {
        if (!dbName || !userName || !tableName) return;
        let alive = true;
        setTagsLoading(true);
        setError('');
        listTableTags({ dbName, userName, tableName, tagColumn: metaTagColumn })
            .then((nextTags) => {
                if (!alive) return;
                setTags(nextTags);
                setSelectedTagName(nextTags[0]?.name ?? '');
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

    const fetchRows = useCallback(async () => {
        if (!dbName || !userName || !tableName || !selectedTagName) {
            setRows([]);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const baseDate = new Date();
            const from = resolveTimeRangeInput(range.from, baseDate);
            const to = resolveTimeRangeInput(range.to, baseDate);
            if (from === null || to === null) {
                setError('Please check the entered time.');
                setRows([]);
                return;
            }
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
            setError(err?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [backwardScan, dbName, page, range.from, range.to, selectedTagName, tableName, tagColumn, timeColumn, userName, valueColumn]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    useEffect(() => {
        setPage(1);
    }, [selectedTagName, range.from, range.to, backwardScan]);

    const timeRangeButtonText = formatTimeRangeLabel(range.from, range.to);
    const timeFormatButtonText = `${getTimeFormatLabel(timeFormat)} / ${getTimeZoneLabel(timeZone)}`;

    return (
        <div className={`neo-data-viewer${embedded ? ' neo-data-viewer-embedded-tab' : ''}`}>
            <header className="page-header">
                <div className="page-header-inner">
                    <div className="data-viewer-header-title">
                        <button type="button" onClick={() => navigate(-1)} className="data-viewer-back-button" aria-label="Back">
                            <ArrowLeft className="icon-base" />
                        </button>
                        <MdQueryStats className="text-primary icon-base" />
                        <h2 className="page-title truncate">{headerLabels.title}</h2>
                        {headerLabels.detail ? <span className="badge badge-muted truncate">{headerLabels.detail}</span> : null}
                    </div>
                </div>
            </header>

            <main className="page-body-full data-viewer-body">
                <div className="page-body-inner">
                    <div className="data-viewer-layout">
                        <aside className="form-card data-viewer-tags">
                            <div className="form-card-header">
                                <span className="section-dot" />
                                Tags
                            </div>
                            <div className="data-viewer-tag-search">
                                <input className="w-full" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="Filter tags..." />
                            </div>
                            <div className="data-viewer-tag-list">
                                {tagsLoading ? <div className="empty-state">Loading tags...</div> : null}
                                {!tagsLoading && visibleTags.length === 0 ? <div className="empty-state">No tags</div> : null}
                                {visibleTags.map((tag) => {
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
                                                <th>Time</th>
                                                <th>Name</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, index) => (
                                                <tr key={`${row.time}-${index}`}>
                                                    <td className="mono">{formatDataViewerTime(row.time, timeFormat, timeZone)}</td>
                                                    <td className="mono">{String(row.name ?? '')}</td>
                                                    <td className="mono">{String(row.value ?? '')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {loading ? <div className="empty-state">Loading...</div> : null}
                                    {!loading && rows.length === 0 ? <div className="empty-state">No data</div> : null}
                                </div>
                                <ResultPagination page={page} rowCount={rows.length} loading={loading} onPage={setPage} />
                            </div>
                        ) : null}
                        {selectedTagName && mode === 'chart' ? (
                            <div className="table-card data-viewer-chart-card">
                                <div className="table-card-body">
                                    {loading ? <div className="empty-state">Loading...</div> : <TagLineChart rows={rows} timeFormat={timeFormat} timeZone={timeZone} />}
                                </div>
                                <ResultPagination page={page} rowCount={rows.length} loading={loading} onPage={setPage} />
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
