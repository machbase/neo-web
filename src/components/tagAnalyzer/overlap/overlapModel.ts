import type {
    EChartsOption,
    TooltipComponentFormatterCallbackParams as TopLevelFormatterParams,
} from 'echarts';
import { getRangeWidth, shiftRange } from '../range/rangeArithmetic';
import { type AxisRange } from '../range/rangeModel';
import { formatAxisTick } from '../format/axisFormat';
import type { PanelInfo } from '../panel/panelModel';
import type { ChartRow } from '../chart/chartData';
import {
    buildInsideDataZoomOption,
    buildLineSeriesOption,
    chartAxis,
    escapeTooltipHtml,
    getTooltipColorStyle,
} from '../chart/chartOptions';

export type OverlapPanelInput = {
    panelInfo: PanelInfo;
    visibleRange: AxisRange;
};

export type OverlapSeriesData = {
    name: string;
    data: ChartRow[];
};

export type OverlapChartSeriesGroup = {
    panelKey: string;
    name: string;
    sourceRange: AxisRange;
    alignedRange: AxisRange;
    seriesData: OverlapSeriesData[];
    shiftValue: number;
};

export function createOverlapChartSeriesGroup(
    { panelInfo, visibleRange }: OverlapPanelInput,
    seriesData: OverlapSeriesData[],
): OverlapChartSeriesGroup {
    const alignmentOffset = -(
        getSeriesTimeBounds(seriesData, true)?.start ?? visibleRange.start
    );

    return {
        panelKey: panelInfo.key,
        name: panelInfo.title.trim() || 'Panel',
        sourceRange: { ...visibleRange },
        alignedRange: shiftRange(visibleRange, alignmentOffset),
        seriesData: alignmentOffset === 0
            ? seriesData
            : seriesData.map((series) => ({
                  ...series,
                  data: shiftChartRows(series.data, alignmentOffset),
              })),
        shiftValue: 0,
    };
}

export function formatOverlapElapsedDurationLabel(value: number): string {
    const duration = Math.trunc(Math.abs(value));
    const clock = [
        Math.floor(duration / OVERLAP_DURATION_HOUR_MS) % 24,
        Math.floor(duration / OVERLAP_DURATION_MINUTE_MS) % 60,
        Math.floor(duration / OVERLAP_DURATION_SECOND_MS) % 60,
    ].map((part) => String(part).padStart(2, '0')).join(':');

    return `${value < 0 ? '-' : ''}${Math.floor(duration / OVERLAP_DURATION_DAY_MS)}:${clock}`;
}

export function buildOverlapChartOption(
    groups: readonly OverlapChartSeriesGroup[],
    includeZeroInYAxisRange: boolean,
    isNumericXAxis: boolean,
): EChartsOption | undefined {
    const seenNameCounts = new Map<string, number>();
    const seriesData = groups.flatMap((group) =>
        group.seriesData.map((series, seriesIndex) => {
            const name = `${group.name} / ${series.name}`;
            const duplicateCount = seenNameCounts.get(name) ?? 0;
            seenNameCounts.set(name, duplicateCount + 1);

            return {
                id: `${group.panelKey}:${seriesIndex}`,
                name: duplicateCount === 0
                    ? name
                    : `${name} (${duplicateCount + 1})`,
                data: shiftChartRows(series.data, group.shiftValue),
            };
        }),
    );
    if (!seriesData.some(({ data }) => data.some(([, value]) => value !== null))) {
        return undefined;
    }

    const xAxisRanges = resolveOverlapChartXAxisRanges(seriesData);

    return {
        animation: false,
        backgroundColor: '#2a2a2a',
        color: OVERLAP_CHART_COLORS,
        grid: { left: 35, right: 18, top: 42, bottom: 28 },
        legend: {
            show: true,
            left: 10,
            top: 6,
            itemGap: 15,
            textStyle: { color: '#e7e8ea', fontSize: 10 },
        },
        tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: '#1f1d1d',
            borderColor: '#292929',
            borderWidth: 1,
            textStyle: { color: '#afb5bc', fontSize: 10 },
            formatter: (params: TopLevelFormatterParams) =>
                formatOverlapTooltip(params, seriesData, isNumericXAxis),
        },
        xAxis: {
            type: 'value',
            axisLine: chartAxis.style.line,
            axisTick: chartAxis.style.line,
            min: xAxisRanges?.axisRange.start,
            max: xAxisRanges?.axisRange.end,
            axisLabel: {
                ...chartAxis.style.xLabel,
                formatter: (overlapXAxisValue: number) =>
                    formatOverlapXAxisLabel(
                        overlapXAxisValue,
                        xAxisRanges?.axisRange,
                        isNumericXAxis,
                    ),
            },
            splitLine: {
                show: true,
                lineStyle: chartAxis.style.splitLine,
            },
        },
        yAxis: {
            type: 'value',
            axisLine: chartAxis.style.line,
            axisLabel: chartAxis.style.yLabel,
            splitLine: {
                show: true,
                lineStyle: chartAxis.style.splitLine,
            },
            scale: true,
            ...chartAxis.resolveValueRange(seriesData, includeZeroInYAxisRange),
        },
        series: seriesData.map(({ id, name, data }, seriesIndex) => {
            const color = OVERLAP_CHART_COLORS[seriesIndex % OVERLAP_CHART_COLORS.length];
            return buildLineSeriesOption({
                id,
                name,
                data,
                legendHoverLink: true,
                showSymbol: data.filter(([, value]) => value !== null).length === 1,
                lineStyle: { width: 0.5, color },
                itemStyle: { color },
                animation: false,
            });
        }),
        toolbox: { show: false },
        dataZoom: [{
            ...buildInsideDataZoomOption(
                0,
                xAxisRanges?.dataRange,
                true,
            ),
            moveOnMouseMove: true,
        }],
    };
}

// -------------------- Local --------------------

function shiftChartRows(rows: ChartRow[], offset: number): ChartRow[] {
    if (offset === 0) return rows;

    return rows.map(([x, value]) => [x + offset, value]);
}

// The min/max plotted timestamp across all series, or undefined when there is
// no plottable span (no data, or every point shares a single timestamp).
function getSeriesTimeBounds(
    seriesData: OverlapSeriesData[],
    allowSingleTimestamp = false,
): AxisRange | undefined {
    let startTime = Infinity;
    let endTime = -Infinity;

    for (const series of seriesData) {
        for (const [timestamp, value] of series.data) {
            if (value === null || !Number.isFinite(timestamp)) continue;
            startTime = Math.min(startTime, timestamp);
            endTime = Math.max(endTime, timestamp);
        }
    }

    return startTime !== Infinity && (allowSingleTimestamp || endTime > startTime)
        ? { start: startTime, end: endTime }
        : undefined;
}

const OVERLAP_CHART_COLORS = [
    '#EB5757',
    '#6FCF97',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#FFD95F',
    '#2D9CDB',
    '#C3A080',
    '#B4B4B4',
    '#6B6B6B',
];
const OVERLAP_EMPTY_X_AXIS_PADDING_RATIO = 4;
const OVERLAP_MIN_EMPTY_X_AXIS_PADDING_MS = 1_000;
const OVERLAP_DURATION_SECOND_MS = 1_000;
const OVERLAP_DURATION_MINUTE_MS = 60 * OVERLAP_DURATION_SECOND_MS;
const OVERLAP_DURATION_HOUR_MS = 60 * OVERLAP_DURATION_MINUTE_MS;
const OVERLAP_DURATION_DAY_MS = 24 * OVERLAP_DURATION_HOUR_MS;
function resolveOverlapChartXAxisRanges(chartData: OverlapSeriesData[]) {
    const dataRange = getSeriesTimeBounds(chartData);
    if (!dataRange) {
        return undefined;
    }

    const padding = Math.max(
        getRangeWidth(dataRange) * OVERLAP_EMPTY_X_AXIS_PADDING_RATIO,
        OVERLAP_MIN_EMPTY_X_AXIS_PADDING_MS,
    );

    return {
        dataRange,
        axisRange: {
            start: dataRange.start - padding,
            end: dataRange.end + padding,
        },
    };
}

function formatOverlapTooltip(
    params: TopLevelFormatterParams,
    chartData: OverlapSeriesData[],
    isNumericXAxis: boolean,
): string {
    const rows = (Array.isArray(params) ? params : [params])
        .map(({ seriesIndex, value, color }) => {
            const [x, y] = Array.isArray(value) ? value : [];
            const text = [
                chartData[seriesIndex ?? 0]?.name,
                formatOverlapXAxisLabel(Number(x ?? 0), undefined, isNumericXAxis),
                y,
            ].map(escapeTooltipHtml).join(' : ');

            return `<div style="${getTooltipColorStyle(color)}">${text}</div>`;
        })
        .join('<br/>');

    return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${rows}</div></div>`;
}

function formatOverlapXAxisLabel(
    xAxisValue: number,
    visibleRange: AxisRange | undefined,
    isNumericXAxis: boolean,
): string {
    if (!Number.isFinite(xAxisValue)) {
        return String(xAxisValue);
    }

    if (!isNumericXAxis) {
        return formatOverlapElapsedDurationLabel(xAxisValue);
    }

    return formatAxisTick(
        xAxisValue,
        visibleRange ?? { start: 0, end: 1 },
        true,
    );
}
