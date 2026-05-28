import type {
    YAXisComponentOption,
    XAXisComponentOption,
} from 'echarts';
import type {
    PanelAxes,
    PanelDisplay,
} from '../../../domain/PanelDomain';
import type { ChartRow, ChartSeriesData } from '../../../domain/ChartDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import { formatAxisValue } from '../../../domain/time/TimeFormatters';
import {
    AXIS_LINE_STYLE,
    AXIS_SPLIT_LINE_STYLE,
    PANEL_AXIS_LABEL_STYLE,
    PANEL_LEFT_Y_AXIS_ID,
    PANEL_MAIN_X_AXIS_ID,
    PANEL_NAVIGATOR_X_AXIS_ID,
    PANEL_NAVIGATOR_Y_AXIS_ID,
    PANEL_RIGHT_Y_AXIS_ID,
    PANEL_Y_AXIS_SPLIT_COUNT,
    Y_AXIS_LABEL_STYLE,
} from './PanelChartOptionConstants';

type ResolvedYAxisRange = {
    min: number | undefined;
    max: number | undefined;
};

type NonEmptyChartSeriesData = [ChartRow, ...ChartRow[]];

type YAxisValueMap = {
    left: number[];
    right: number[];
};
const HIDDEN_AXIS_PART = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { show: false },
    axisPointer: {
        show: false,
        label: { show: false },
    },
} as const;

function getSeriesValueRange(seriesData: NonEmptyChartSeriesData): [number, number] {
    return seriesData.reduce<[number, number]>(
        (seriesValueRange, chartRow) => {
            if (chartRow[1] < seriesValueRange[0]) seriesValueRange[0] = chartRow[1];
            if (chartRow[1] > seriesValueRange[1]) seriesValueRange[1] = chartRow[1];
            return seriesValueRange;
        },
        [seriesData[0][1], seriesData[0][1]],
    );
}

function getRoundedAxisStep(axisRangeValue: number): number {
    const sReferenceValue = Math.max(
        Math.abs(axisRangeValue) / PANEL_Y_AXIS_SPLIT_COUNT,
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

function updateAxisBounds(
    axisBounds: number[],
    seriesData: NonEmptyChartSeriesData,
    zeroBase: boolean,
): void {
    const [sSeriesMin, sSeriesMax] = getSeriesValueRange(seriesData);
    const sMin = zeroBase ? Math.min(sSeriesMin, 0) : sSeriesMin;
    const sMax = zeroBase ? Math.max(sSeriesMax, 0) : sSeriesMax;
    if (axisBounds[0] === undefined || axisBounds[0] > sMin) axisBounds[0] = sMin;
    if (axisBounds[1] === undefined || axisBounds[1] < sMax) axisBounds[1] = sMax;
}

function roundAxisBounds(axisBounds: number[]): void {
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

function getYAxisValues(
    chartData: ChartSeriesData[],
    axes: PanelAxes,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [] as number[],
        right: [] as number[],
    };

    chartData.forEach((series) => {
        if (!series.data?.length) return;
        const sSeriesData = series.data as NonEmptyChartSeriesData;
        const sYAxisIndex = series.yAxis ?? 0;
        const sAxisValues = sYAxisIndex === 0
            ? sYAxis.left
            : sYAxisIndex === 1
            ? sYAxis.right
            : undefined;

        if (!sAxisValues) throw new Error(`Unsupported Y-axis index: ${sYAxisIndex}.`);
        updateAxisBounds(
            sAxisValues,
            sSeriesData,
            sYAxisIndex === 0
                ? axes.left_y_axis.zero_base
                : axes.right_y_axis.zero_base,
        );
    });

    roundAxisBounds(sYAxis.left);
    roundAxisBounds(sYAxis.right);

    return sYAxis;
}

function getChartDataInsideRange(
    chartData: ChartSeriesData[],
    range: TimeRangeMs | undefined,
): ChartSeriesData[] {
    if (!range) {
        return chartData;
    }

    return chartData.map((series) => ({
        ...series,
        data: series.data.filter(
            ([timestamp]) =>
                timestamp >= range.startTime &&
                timestamp <= range.endTime,
        ),
    }));
}

export function resolveAxisRange(
    manualRange: { min: number; max: number },
    defaultMin: number | undefined,
    defaultMax: number | undefined,
): ResolvedYAxisRange {
    if (manualRange.min === 0 && manualRange.max === 0) {
        return { min: defaultMin, max: defaultMax };
    }

    return { min: manualRange.min, max: manualRange.max };
}

// Keeps the main plot and navigator x-axes locked to the same time range.
export function buildChartXAxisOption(
    navigatorRange: TimeRangeMs,
    display: PanelDisplay,
    axes: PanelAxes,
    isNumericXAxis: boolean,
): XAXisComponentOption[] {
    const sAxisType: XAXisComponentOption['type'] = isNumericXAxis ? 'value' : 'time';

    return [
        {
            id: PANEL_MAIN_X_AXIS_ID,
            type: sAxisType,
            gridIndex: 0,
            min: navigatorRange.startTime,
            max: navigatorRange.endTime,
            axisLine: AXIS_LINE_STYLE,
            axisTick: AXIS_LINE_STYLE,
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (xAxisValue: number) =>
                    formatAxisValue(xAxisValue, navigatorRange, isNumericXAxis),
            },
            splitLine: {
                show: display.use_zoom && axes.x_axis.show_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            axisPointer: {
                label: {
                    show: false,
                },
            },
        },
        {
            id: PANEL_NAVIGATOR_X_AXIS_ID,
            type: sAxisType,
            gridIndex: 1,
            min: navigatorRange.startTime,
            max: navigatorRange.endTime,
            ...HIDDEN_AXIS_PART,
        },
    ];
}

function buildMainYAxisOption({
    id,
    axisRange,
    position,
    showAxisLabel,
    showTickLine,
}: {
    id: string;
    axisRange: ResolvedYAxisRange;
    position?: 'left' | 'right';
    showAxisLabel?: boolean;
    showTickLine: boolean;
}): YAXisComponentOption {
    return {
        id,
        type: 'value',
        gridIndex: 0,
        min: axisRange.min,
        max: axisRange.max,
        position,
        axisLine: AXIS_LINE_STYLE,
        axisLabel: showAxisLabel === undefined
            ? Y_AXIS_LABEL_STYLE
            : { ...Y_AXIS_LABEL_STYLE, show: showAxisLabel },
        splitLine: {
            show: showTickLine,
            lineStyle: AXIS_SPLIT_LINE_STYLE,
        },
        minInterval: 0,
        scale: true,
    };
}

export function buildChartYAxisOption(
    axes: PanelAxes,
    chartData: ChartSeriesData[],
    isRaw: boolean,
    useNormalize: boolean,
    visibleRange?: TimeRangeMs,
): YAXisComponentOption[] {
    const sYAxisValues = getYAxisValues(
        getChartDataInsideRange(chartData, visibleRange),
        axes,
    );
    const sLeftAxisRange = resolveAxisRange(
        isRaw ? axes.left_y_axis.raw_data_value_range : axes.left_y_axis.value_range,
        sYAxisValues.left[0],
        sYAxisValues.left[1],
    );
    const sRightAxisRange = resolveAxisRange(
        isRaw
            ? axes.right_y_axis.raw_data_value_range
            : axes.right_y_axis.value_range,
        useNormalize ? 0 : sYAxisValues.right[0],
        useNormalize ? 100 : sYAxisValues.right[1],
    );

    return [
        buildMainYAxisOption({
            id: PANEL_LEFT_Y_AXIS_ID,
            axisRange: sLeftAxisRange,
            showTickLine: axes.left_y_axis.show_tickline,
        }),
        buildMainYAxisOption({
            id: PANEL_RIGHT_Y_AXIS_ID,
            axisRange: sRightAxisRange,
            position: axes.right_y_axis_enabled ? 'right' : 'left',
            showAxisLabel: chartData.some((series) => series.yAxis === 1),
            showTickLine: axes.right_y_axis.show_tickline,
        }),
        {
            id: PANEL_NAVIGATOR_Y_AXIS_ID,
            type: 'value',
            gridIndex: 1,
            boundaryGap: ['18%', '18%'],
            ...HIDDEN_AXIS_PART,
            scale: true,
        },
    ];
}
