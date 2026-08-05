import type {
    DefaultLabelFormatterCallbackParams as CallbackDataParams,
    EChartsOption,
    TooltipComponentFormatterCallbackParams as TopLevelFormatterParams,
    XAXisComponentOption,
    YAXisComponentOption,
} from 'echarts';
import { getRangeWidth, shiftRange } from '../range/rangeArithmetic';
import { type AxisRange } from '../range/rangeModel';
import { formatAxisTick } from '../format/axisFormat';
import type { PanelInfo } from '../panel/panelModel';
import type { ChartRow, ChartSeriesData } from '../chart/chartData';
import {
    buildInsideDataZoomOption,
    buildLineSeriesOption,
    chartAxis,
    escapeTooltipHtml,
    getTooltipColorStyle,
} from '../chart/chartModel';

export type OverlapPanelInput = {
    panelInfo: PanelInfo;
    visibleRange: AxisRange;
};

export type OverlapChartSeriesGroup = {
    panelKey: string;
    name: string;
    sourceRange: AxisRange;
    alignedRange: AxisRange;
    seriesData: ChartSeriesData[];
    shiftValue: number;
};

type OverlapChartSeriesData = ChartSeriesData & {
    id: string;
};

export function createOverlapChartSeriesGroup(
    input: OverlapPanelInput,
    seriesData: ChartSeriesData[],
): OverlapChartSeriesGroup {
    const origin = getSeriesTimeBounds(seriesData, true)?.start;
    const alignmentOffset = -(origin ?? input.visibleRange.start);

    return {
        panelKey: input.panelInfo.key,
        name: input.panelInfo.title.trim() || 'Panel',
        sourceRange: { ...input.visibleRange },
        alignedRange: shiftRange(input.visibleRange, alignmentOffset),
        seriesData: alignmentOffset === 0
            ? seriesData
            : seriesData.map((series) => ({
                  ...series,
                  data: shiftChartRows(series.data, alignmentOffset),
              })),
        shiftValue: 0,
    };
}

export function getOverlapChartSeriesGroupRange(
    group: OverlapChartSeriesGroup,
): AxisRange {
    return shiftRange(group.alignedRange, group.shiftValue);
}

export function joinOverlapChartSeriesGroups(
    groups: readonly OverlapChartSeriesGroup[],
): OverlapChartSeriesData[] {
    const seenNameCounts = new Map<string, number>();

    return groups.flatMap((group) =>
        group.seriesData.map((series, seriesIndex) => {
            const name = `${group.name} / ${series.name}`;
            const duplicateCount = seenNameCounts.get(name) ?? 0;
            seenNameCounts.set(name, duplicateCount + 1);

            return {
                ...series,
                id: `${group.panelKey}:${seriesIndex}`,
                name:
                    duplicateCount === 0
                        ? name
                        : `${name} (${duplicateCount + 1})`,
                data: shiftChartRows(series.data, group.shiftValue),
            };
        }),
    );
}

function shiftChartRows(rows: ChartRow[], offset: number): ChartRow[] {
    if (offset === 0) return rows;

    return rows.map(([x, value]) => [x + offset, value]);
}

// The min/max plotted timestamp across all series, or undefined when there is
// no plottable span (no data, or every point shares a single timestamp).
function getSeriesTimeBounds(
    seriesData: ChartSeriesData[],
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
const OVERLAP_X_AXIS_STATIC_OPTION = {
    type: 'value',
    axisLine: chartAxis.style.line,
    axisTick: chartAxis.style.line,
    axisLabel: chartAxis.style.xLabel,
    splitLine: {
        show: true,
        lineStyle: chartAxis.style.splitLine,
    },
} satisfies XAXisComponentOption;
const OVERLAP_Y_AXIS_STATIC_OPTION = {
    type: 'value',
    axisLine: chartAxis.style.line,
    axisLabel: chartAxis.style.yLabel,
    splitLine: {
        show: true,
        lineStyle: chartAxis.style.splitLine,
    },
    scale: true,
} satisfies YAXisComponentOption;

function resolveOverlapChartXAxisRanges(chartData: ChartSeriesData[]) {
    const sDataRange = getSeriesTimeBounds(chartData);
    if (!sDataRange) {
        return undefined;
    }

    const sPadding = Math.max(
        getRangeWidth(sDataRange) * OVERLAP_EMPTY_X_AXIS_PADDING_RATIO,
        OVERLAP_MIN_EMPTY_X_AXIS_PADDING_MS,
    );

    return {
        dataRange: sDataRange,
        axisRange: {
            start: sDataRange.start - sPadding,
            end: sDataRange.end + sPadding,
        },
    };
}

function formatOverlapTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    chartData: ChartSeriesData[],
    isNumericXAxis: boolean,
): string {
    const sList = Array.isArray(tooltipFormatterParams)
        ? tooltipFormatterParams
        : [tooltipFormatterParams];
    const sRows = sList
        .map((raw) => {
            const sParam = raw as CallbackDataParams;
            const sName = chartData[sParam.seriesIndex ?? 0]?.name ?? '';
            const sValue = Array.isArray(sParam.value)
                ? (sParam.value as Array<number | string | null | undefined>)
                : undefined;
            const sTimestamp = Number(sValue?.[0] ?? 0);
            const sColorStyle = getTooltipColorStyle(sParam.color);
            const sXAxisLabel = formatOverlapXAxisLabel(
                sTimestamp,
                undefined,
                isNumericXAxis,
            );

            return `<div style="${sColorStyle}">${escapeTooltipHtml(sName)} : ${escapeTooltipHtml(sXAxisLabel)} : ${escapeTooltipHtml(sValue?.[1] ?? '')}</div>`;
        })
        .join('<br/>');

    return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sRows}</div></div>`;
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

export function formatOverlapElapsedDurationLabel(value: number): string {
    const sSign = value < 0 ? '-' : '';
    const sAbsoluteValue = Math.trunc(Math.abs(value));
    const sDays = Math.floor(sAbsoluteValue / OVERLAP_DURATION_DAY_MS);
    const sHours = Math.floor(sAbsoluteValue / OVERLAP_DURATION_HOUR_MS) % 24;
    const sMinutes = Math.floor(sAbsoluteValue / OVERLAP_DURATION_MINUTE_MS) % 60;
    const sSeconds = Math.floor(sAbsoluteValue / OVERLAP_DURATION_SECOND_MS) % 60;

    return `${sSign}${sDays}:${[sHours, sMinutes, sSeconds]
        .map((part) => String(part).padStart(2, '0'))
        .join(':')}`;
}

export function buildOverlapChartOption(
    seriesData: OverlapChartSeriesData[],
    includeZeroInYAxisRange: boolean,
    isNumericXAxis: boolean,
): EChartsOption {
    const sXAxisRanges = resolveOverlapChartXAxisRanges(seriesData);
    const sYAxisRange = chartAxis.resolveValueRange(
        seriesData,
        includeZeroInYAxisRange,
    );
    const sSeries = seriesData.map(
        (chartSeries, seriesIndex) => {
            const sSeriesColor =
                chartSeries.color ??
                OVERLAP_CHART_COLORS[
                    seriesIndex % OVERLAP_CHART_COLORS.length
                ];
            const sPlottablePointCount = chartSeries.data.filter(
                ([, value]) => value !== null,
            ).length;

            return buildLineSeriesOption({
                id: chartSeries.id,
                name: chartSeries.name,
                data: chartSeries.data,
                legendHoverLink: true,
                showSymbol: sPlottablePointCount === 1,
                lineStyle: {
                    width: 0.5,
                    color: sSeriesColor,
                },
                itemStyle: {
                    color: sSeriesColor,
                },
                animation: false,
            });
        },
    );

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
            ...OVERLAP_X_AXIS_STATIC_OPTION,
            min: sXAxisRanges?.axisRange.start,
            max: sXAxisRanges?.axisRange.end,
            axisLabel: {
                ...OVERLAP_X_AXIS_STATIC_OPTION.axisLabel,
                formatter: (overlapXAxisValue: number) =>
                    formatOverlapXAxisLabel(
                        overlapXAxisValue,
                        sXAxisRanges?.axisRange,
                        isNumericXAxis,
                    ),
            },
        },
        yAxis: {
            ...OVERLAP_Y_AXIS_STATIC_OPTION,
            min: sYAxisRange.min,
            max: sYAxisRange.max,
        },
        series: sSeries,
        toolbox: { show: false },
        dataZoom: [{
            ...buildInsideDataZoomOption(
                0,
                sXAxisRanges?.dataRange,
                true,
            ),
            moveOnMouseMove: true,
        }],
    };
}
