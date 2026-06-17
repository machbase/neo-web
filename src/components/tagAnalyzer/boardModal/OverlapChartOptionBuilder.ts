import type {
    DataZoomComponentOption,
    EChartsOption,
    GridComponentOption,
    LegendComponentOption,
    LineSeriesOption,
    ToolboxComponentOption,
    TooltipComponentOption,
    XAXisComponentOption,
    YAXisComponentOption,
} from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import type {
    ChartRow,
    ChartSeriesData,
} from '../domain/ChartDomain';
import {
    formatAxisValue,
    formatLocalTimestampWithMilliseconds,
} from '../domain/time/formatting/TimeFormatters';

type AxisLineStyleOption = NonNullable<XAXisComponentOption['axisLine']>;
type AxisSplitLineStyleOption = NonNullable<
    NonNullable<XAXisComponentOption['splitLine']>['lineStyle']
>;
type TooltipValueItem = number | string | null | undefined;
type TooltipArrayValue = Array<TooltipValueItem>;
type OverlapTooltipParam = Partial<{
    seriesIndex: number;
    value: TooltipArrayValue;
    color: string;
}>;
type OverlapChartYAxisRange = {
    min: number | undefined;
    max: number | undefined;
};
type OverlapChartXAxisRange = {
    startTime: number;
    endTime: number;
};
type OverlapChartXAxisRanges = {
    dataRange: OverlapChartXAxisRange;
    axisRange: OverlapChartXAxisRange;
};

export type OverlapChartInfo = {
    seriesData: ChartSeriesData[];
    seriesStartTimeList: number[];
    includeZeroInYAxisRange: boolean;
};

const OVERLAP_CHART_COLORS = ['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'];
const OVERLAP_Y_AXIS_SPLIT_COUNT = 5;
const OVERLAP_EMPTY_X_AXIS_PADDING_RATIO = 4;
const OVERLAP_MIN_EMPTY_X_AXIS_PADDING_MS = 1_000;
const COMPACT_AXIS_UNITS = [{ value: 1_000_000_000_000, suffix: 'T' }, { value: 1_000_000_000, suffix: 'B' }, { value: 1_000_000, suffix: 'M' }, { value: 1_000, suffix: 'K' }] as const;
const COMPACT_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
});
const STANDARD_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
});
const DEFAULT_NOT_SHOW = {
    show: false,
} as const;
const LEGEND_TEXT_STYLE = {
    color: '#e7e8ea',
    fontSize: 10,
} satisfies LegendComponentOption['textStyle'];
const TOOLTIP_TEXT_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
} satisfies TooltipComponentOption['textStyle'];
const PANEL_AXIS_LABEL_STYLE = {
    color: '#f8f8f8',
    fontSize: 10,
} satisfies XAXisComponentOption['axisLabel'];
const Y_AXIS_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
    formatter: formatYAxisLabel,
} satisfies YAXisComponentOption['axisLabel'];
const AXIS_LINE_STYLE = { lineStyle: { color: '#323333' } } satisfies AxisLineStyleOption;
const AXIS_SPLIT_LINE_STYLE = {
    color: '#323333',
    width: 1,
} satisfies AxisSplitLineStyleOption;
const TOOLTIP_BASE: TooltipComponentOption = { trigger: 'axis', confine: true, backgroundColor: '#1f1d1d', borderColor: '#292929', borderWidth: 1, textStyle: TOOLTIP_TEXT_STYLE };
const OVERLAP_CHART_BASE_OPTION = {
    animation: false,
    backgroundColor: '#2a2a2a',
    color: OVERLAP_CHART_COLORS,
} satisfies EChartsOption;
const OVERLAP_LEGEND_OPTION = {
    show: true,
    left: 10,
    top: 6,
    itemGap: 15,
    textStyle: LEGEND_TEXT_STYLE,
} satisfies LegendComponentOption;
const OVERLAP_GRID_OPTION = {
    left: 35,
    right: 18,
    top: 42,
    bottom: 28,
} satisfies GridComponentOption;
const OVERLAP_TOOLBOX_OPTION = {
    ...DEFAULT_NOT_SHOW,
} satisfies ToolboxComponentOption;
const OVERLAP_X_AXIS_STATIC_OPTION = {
    type: 'time',
    axisLine: AXIS_LINE_STYLE,
    axisTick: AXIS_LINE_STYLE,
    axisLabel: PANEL_AXIS_LABEL_STYLE,
    splitLine: {
        show: true,
        lineStyle: AXIS_SPLIT_LINE_STYLE,
    },
} satisfies XAXisComponentOption;
const OVERLAP_Y_AXIS_STATIC_OPTION = {
    type: 'value',
    axisLine: AXIS_LINE_STYLE,
    axisLabel: Y_AXIS_LABEL_STYLE,
    splitLine: {
        show: true,
        lineStyle: AXIS_SPLIT_LINE_STYLE,
    },
    scale: true,
} satisfies YAXisComponentOption;

function getSeriesValueRange(seriesData: ChartRow[]): [number, number] | undefined {
    const sValues = seriesData
        .map((chartRow) => chartRow[1])
        .filter((value): value is number => value !== null);

    if (sValues.length === 0) {
        return undefined;
    }

    return [Math.min(...sValues), Math.max(...sValues)];
}

function getRoundedAxisStep(axisRangeValue: number): number {
    const sReferenceValue = Math.max(
        Math.abs(axisRangeValue) / OVERLAP_Y_AXIS_SPLIT_COUNT,
        Number.MIN_VALUE,
    );
    const sExponent = Math.floor(Math.log10(sReferenceValue));
    const sMagnitude = 10 ** sExponent;
    const sFraction = sReferenceValue / sMagnitude;

    if (sFraction <= 1) {
        return sMagnitude;
    }
    if (sFraction <= 2) {
        return 2 * sMagnitude;
    }
    if (sFraction <= 5) {
        return 5 * sMagnitude;
    }

    return 10 * sMagnitude;
}

function updateYAxisBounds(
    axisBounds: number[],
    seriesData: ChartRow[],
    includeZeroInRange: boolean,
): void {
    const sSeriesValueRange = getSeriesValueRange(seriesData);
    if (!sSeriesValueRange) {
        return;
    }

    const [sSeriesMin, sSeriesMax] = sSeriesValueRange;
    const sMin = includeZeroInRange ? Math.min(sSeriesMin, 0) : sSeriesMin;
    const sMax = includeZeroInRange ? Math.max(sSeriesMax, 0) : sSeriesMax;

    if (axisBounds[0] === undefined || axisBounds[0] > sMin) axisBounds[0] = sMin;
    if (axisBounds[1] === undefined || axisBounds[1] < sMax) axisBounds[1] = sMax;
}

function roundYAxisBounds(axisBounds: number[]): void {
    const sRawMin = axisBounds[0];
    const sRawMax = axisBounds[1];

    if (sRawMin === undefined || sRawMax === undefined) {
        return;
    }

    const sRange = sRawMax - sRawMin;
    const sFallbackRange = Math.max(Math.abs(sRawMax), Math.abs(sRawMin), 1);
    const sStep = getRoundedAxisStep(sRange > 0 ? sRange : sFallbackRange);
    const sRoundedMin = Math.floor(sRawMin / sStep) * sStep;
    const sRoundedMax = Math.ceil(sRawMax / sStep) * sStep;

    axisBounds[0] = Number(sRoundedMin.toPrecision(12));
    axisBounds[1] = Number(
        (sRoundedMax > sRoundedMin ? sRoundedMax : sRoundedMin + sStep)
            .toPrecision(12),
    );
}

function resolveOverlapChartYAxisRange(
    chartData: ChartSeriesData[],
    includeZeroInRange: boolean,
): OverlapChartYAxisRange {
    const sYAxisBounds: number[] = [];

    chartData.forEach((series) => {
        if (!series.data?.length) {
            return;
        }

        updateYAxisBounds(
            sYAxisBounds,
            series.data,
            includeZeroInRange,
        );
    });
    roundYAxisBounds(sYAxisBounds);

    return {
        min: sYAxisBounds[0],
        max: sYAxisBounds[1],
    };
}

function resolveOverlapChartXAxisRanges(
    chartData: ChartSeriesData[],
): OverlapChartXAxisRanges | undefined {
    const sTimestamps = chartData.flatMap((series) =>
        series.data.map(([timestamp]) => timestamp),
    );

    if (sTimestamps.length === 0) {
        return undefined;
    }

    const sDataStartTime = Math.min(...sTimestamps);
    const sDataEndTime = Math.max(...sTimestamps);

    if (
        !Number.isFinite(sDataStartTime) ||
        !Number.isFinite(sDataEndTime)
    ) {
        return undefined;
    }

    const sDataWidth = sDataEndTime - sDataStartTime;
    if (sDataWidth <= 0) {
        return undefined;
    }

    const sPadding = Math.max(
        sDataWidth * OVERLAP_EMPTY_X_AXIS_PADDING_RATIO,
        OVERLAP_MIN_EMPTY_X_AXIS_PADDING_MS,
    );

    return {
        dataRange: {
            startTime: sDataStartTime,
            endTime: sDataEndTime,
        },
        axisRange: {
            startTime: sDataStartTime - sPadding,
            endTime: sDataEndTime + sPadding,
        },
    };
}

function getOverlapTooltipParams(
    tooltipFormatterParams: TopLevelFormatterParams,
): OverlapTooltipParam[] {
    const sTooltipParams = Array.isArray(tooltipFormatterParams)
        ? tooltipFormatterParams
        : [tooltipFormatterParams];

    return sTooltipParams.map((tooltipCallbackParam) => {
        const sParam = tooltipCallbackParam as CallbackDataParams;

        return {
            color: typeof sParam.color === 'string' ? sParam.color : undefined,
            seriesIndex: sParam.seriesIndex,
            value: Array.isArray(sParam.value)
                ? (sParam.value as TooltipArrayValue)
                : undefined,
        };
    });
}

function getOverlapTooltipTimestamp(
    tooltipItem: OverlapTooltipParam,
): number {
    return Number(tooltipItem.value?.[0] ?? 0);
}

function formatOverlapTooltipRow(
    tooltipItem: OverlapTooltipParam,
    chartData: ChartSeriesData[],
): string {
    const sSeriesIndex = tooltipItem.seriesIndex ?? 0;
    const sSeriesName = chartData[sSeriesIndex]?.name ?? '';
    const sTimestamp = getOverlapTooltipTimestamp(tooltipItem);

    return `<div style="color:${tooltipItem.color}">${sSeriesName} : ${formatLocalTimestampWithMilliseconds(
        sTimestamp,
    )} : ${tooltipItem.value?.[1] ?? ''}</div>`;
}

function formatOverlapTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    chartData: ChartSeriesData[],
): string {
    const sTooltipRows = getOverlapTooltipParams(tooltipFormatterParams)
        .map((tooltipItem) =>
            formatOverlapTooltipRow(tooltipItem, chartData),
        )
        .join('<br/>');

    return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sTooltipRows}</div></div>`;
}

function buildOverlapTooltipOption(
    chartData: ChartSeriesData[],
): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        formatter: (tooltipFormatterParams: TopLevelFormatterParams) =>
            formatOverlapTooltip(
                tooltipFormatterParams,
                chartData,
            ),
    };
}

function buildOverlapDataZoomOption(
    visibleRange: OverlapChartXAxisRange | undefined,
): DataZoomComponentOption[] {
    const sInitialWindow = visibleRange
        ? {
              startValue: visibleRange.startTime,
              endValue: visibleRange.endTime,
          }
        : {};

    return [{
        type: 'inside',
        xAxisIndex: [0],
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseWheel: false,
        moveOnMouseMove: false,
        preventDefaultMouseMove: true,
        ...sInitialWindow,
    }];
}

function formatOverlapXAxisLabel(
    xAxisValue: number,
    visibleRange: OverlapChartXAxisRange | undefined,
): string {
    if (!visibleRange) {
        return String(xAxisValue);
    }

    return formatAxisValue(
        xAxisValue,
        visibleRange,
        false,
    );
}

function formatYAxisLabel(value: string | number): string {
    const sNumericValue = Number(value);

    if (!Number.isFinite(sNumericValue)) {
        return String(value);
    }

    const sNormalizedValue = Object.is(sNumericValue, -0) ? 0 : sNumericValue;
    const sAbsoluteValue = Math.abs(sNormalizedValue);
    const sUnitIndex = COMPACT_AXIS_UNITS.findIndex(
        (unit) => sAbsoluteValue >= unit.value,
    );

    if (sUnitIndex === -1) {
        return STANDARD_AXIS_NUMBER_FORMATTER.format(sNormalizedValue);
    }

    const sUnit = COMPACT_AXIS_UNITS[
        shouldUseNextLargerUnit(sAbsoluteValue, sUnitIndex)
            ? sUnitIndex - 1
            : sUnitIndex
    ];

    return `${COMPACT_AXIS_NUMBER_FORMATTER.format(
        sNormalizedValue / sUnit.value,
    )}${sUnit.suffix}`;
}

function shouldUseNextLargerUnit(
    absoluteValue: number,
    unitIndex: number,
): boolean {
    if (unitIndex <= 0) {
        return false;
    }

    const sRoundedScaledValue =
        Math.round((absoluteValue / COMPACT_AXIS_UNITS[unitIndex].value) * 10) / 10;

    return sRoundedScaledValue >= 1000;
}

export function buildOverlapChartOption(
    overlapChartInfo: OverlapChartInfo,
): EChartsOption {
    const sXAxisRanges = resolveOverlapChartXAxisRanges(
        overlapChartInfo.seriesData,
    );
    const sYAxisRange = resolveOverlapChartYAxisRange(
        overlapChartInfo.seriesData,
        overlapChartInfo.includeZeroInYAxisRange,
    );
    const sSeries: LineSeriesOption[] = overlapChartInfo.seriesData.map((chartSeries, seriesIndex) => {
        const sSeriesColor =
            chartSeries.color ??
            OVERLAP_CHART_COLORS[seriesIndex % OVERLAP_CHART_COLORS.length];

        return {
            id: `overlap-series-${seriesIndex}`,
            name: chartSeries.name,
            type: 'line',
            data: chartSeries.data,
            showSymbol: false,
            lineStyle: {
                width: 0.5,
                color: sSeriesColor,
            },
            itemStyle: {
                color: sSeriesColor,
            },
            animation: false,
            sampling: chartSeries.data.length > 1000 ? 'lttb' : undefined,
        };
    });

    return {
        ...OVERLAP_CHART_BASE_OPTION,
        grid: OVERLAP_GRID_OPTION,
        legend: OVERLAP_LEGEND_OPTION,
        tooltip: buildOverlapTooltipOption(overlapChartInfo.seriesData),
        xAxis: {
            ...OVERLAP_X_AXIS_STATIC_OPTION,
            min: sXAxisRanges?.axisRange.startTime,
            max: sXAxisRanges?.axisRange.endTime,
            axisLabel: {
                ...OVERLAP_X_AXIS_STATIC_OPTION.axisLabel,
                formatter: (overlapXAxisValue: number) =>
                    formatOverlapXAxisLabel(
                        overlapXAxisValue,
                        sXAxisRanges?.axisRange,
                    ),
            },
        },
        yAxis: {
            ...OVERLAP_Y_AXIS_STATIC_OPTION,
            min: sYAxisRange.min,
            max: sYAxisRange.max,
        },
        series: sSeries,
        toolbox: OVERLAP_TOOLBOX_OPTION,
        dataZoom: buildOverlapDataZoomOption(sXAxisRanges?.dataRange),
    };
}
