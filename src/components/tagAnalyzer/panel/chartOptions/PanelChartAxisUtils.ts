import type {
    ChartSeriesItem,
    PanelAxes,
    PanelDisplay,
    TimeRange,
} from '../../common/modelTypes';
import type {
    AxisRange,
    NonEmptyChartSeriesData,
    PanelYAxisOptions,
    YAxisValueMap,
} from './PanelChartOptionTypes';
import {
    AXIS_LINE_STYLE,
    AXIS_SPLIT_LINE_STYLE,
    PANEL_AXIS_LABEL_STYLE,
    PANEL_Y_AXIS_SPLIT_COUNT,
    Y_AXIS_LABEL_STYLE,
} from './PanelChartOptionConstants';
import { formatAxisTime } from './PanelChartTooltipUtils';

const OVERLAP_AXES_TEMPLATE: PanelAxes = {
    show_x_tickline: true,
    pixels_per_tick_raw: 0,
    pixels_per_tick: 0,
    use_sampling: false,
    sampling_value: 0,
    zero_base: false,
    show_y_tickline: true,
    primaryRange: { min: 0, max: 0 },
    primaryDrilldownRange: { min: 0, max: 0 },
    use_ucl: false,
    ucl_value: 0,
    use_lcl: false,
    lcl_value: 0,
    use_right_y2: false,
    zero_base2: false,
    show_y_tickline2: false,
    secondaryRange: { min: 0, max: 0 },
    secondaryDrilldownRange: { min: 0, max: 0 },
    use_ucl2: false,
    ucl2_value: 0,
    use_lcl2: false,
    lcl2_value: 0,
};

/**
 * Builds the main and navigator x-axis definitions for the panel chart.
 * @param aNavigatorRange The full navigator range that bounds the chart axes.
 * @param aDisplay The display settings used for zoom-driven tick lines.
 * @param aAxes The panel axis settings used for x-axis grid lines.
 * @returns The x-axis definitions for the main panel chart.
 */
export function buildPanelXAxisOption(
    aNavigatorRange: TimeRange,
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
) {
    return [
        {
            type: 'time' as const,
            gridIndex: 0,
            min: aNavigatorRange.startTime,
            max: aNavigatorRange.endTime,
            axisLine: AXIS_LINE_STYLE,
            axisTick: AXIS_LINE_STYLE,
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (aValue: number) => formatAxisTime(aValue, aNavigatorRange),
            },
            splitLine: {
                show: aDisplay.use_zoom && aAxes.show_x_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            axisPointer: {
                label: {
                    show: false,
                },
            },
        },
        {
            type: 'time' as const,
            gridIndex: 1,
            min: aNavigatorRange.startTime,
            max: aNavigatorRange.endTime,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { show: false },
            axisPointer: {
                show: false,
                label: {
                    show: false,
                },
            },
        },
    ];
}

/**
 * Builds the panel Y axes from panel settings and visible data.
 * @param aAxes The panel axis settings used to size and decorate the y-axes.
 * @param aChartData The visible chart datasets used to derive axis ranges.
 * @param aIsRaw Whether the chart is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is currently enabled.
 * @returns The ECharts y-axis definitions for the main panel.
 */
export function buildPanelYAxisOption(
    aAxes: PanelAxes,
    aChartData: ChartSeriesItem[] | undefined,
    aIsRaw: boolean,
    aUseNormalize: boolean,
): PanelYAxisOptions {
    const sYAxisValues = getYAxisValues(aChartData, aAxes);
    const sLeftAxisRange = resolveAxisRange(
        aIsRaw ? aAxes.primaryDrilldownRange : aAxes.primaryRange,
        sYAxisValues.left[0],
        sYAxisValues.left[1],
    );
    const sRightAxisRange = resolveAxisRange(
        aIsRaw ? aAxes.secondaryDrilldownRange : aAxes.secondaryRange,
        aUseNormalize ? 0 : sYAxisValues.right[0],
        aUseNormalize ? 100 : sYAxisValues.right[1],
    );

    return [
        {
            type: 'value',
            gridIndex: 0,
            min: sLeftAxisRange.min,
            max: sLeftAxisRange.max,
            axisLine: AXIS_LINE_STYLE,
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: aAxes.show_y_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 0,
            min: sRightAxisRange.min,
            max: sRightAxisRange.max,
            position: aAxes.use_right_y2 ? 'right' : 'left',
            axisLine: AXIS_LINE_STYLE,
            axisLabel: {
                ...Y_AXIS_LABEL_STYLE,
                show: Boolean(aChartData?.some((aItem) => aItem.yAxis === 1)),
            },
            splitLine: {
                show: aAxes.show_y_tickline2,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 1,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { show: false },
            scale: true,
        },
    ];
}

/**
 * Resolves the overlap-chart y-axis range from the current datasets.
 * @param aChartData The overlap chart datasets.
 * @param aZeroBase Whether zero should be forced into the overlap range.
 * @returns The overlap-chart y-axis range.
 */
export function resolveOverlapYAxisRange(
    aChartData: ChartSeriesItem[] | undefined,
    aZeroBase: boolean,
): AxisRange {
    const sYAxisValues = getYAxisValues(aChartData, {
        ...OVERLAP_AXES_TEMPLATE,
        zero_base: aZeroBase,
        zero_base2: aZeroBase,
    });

    return {
        min: sYAxisValues.left[0],
        max: sYAxisValues.left[1],
    };
}

function getSeriesExtent(aSeriesData: NonEmptyChartSeriesData): [number, number] {
    return aSeriesData.reduce<[number, number]>(
        (aResult, aCurrent) => {
            if (aCurrent[1] < aResult[0]) aResult[0] = aCurrent[1];
            if (aCurrent[1] > aResult[1]) aResult[1] = aCurrent[1];
            return aResult;
        },
        [aSeriesData[0][1], aSeriesData[0][1]],
    );
}

function getRoundedAxisStep(aValue: number): number {
    const sReferenceValue = Math.max(Math.abs(aValue) / PANEL_Y_AXIS_SPLIT_COUNT, Number.MIN_VALUE);
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

function roundAxisMaximum(aValue: number): number {
    if (!Number.isFinite(aValue) || aValue === 0) {
        return aValue;
    }

    const sStep = getRoundedAxisStep(aValue);
    const sRoundedValue = Math.ceil(aValue / sStep) * sStep;
    const sExpandedValue = sRoundedValue > aValue ? sRoundedValue : sRoundedValue + sStep;

    return Number(sExpandedValue.toPrecision(12));
}

function updateAxisBounds(
    aBounds: number[],
    aSeriesData: NonEmptyChartSeriesData,
    aZeroBase: boolean,
): void {
    const [sSeriesMin, sSeriesMax] = getSeriesExtent(aSeriesData);
    const sMin = aZeroBase ? Math.min(sSeriesMin, 0) : sSeriesMin;
    const sMax = aZeroBase ? Math.max(sSeriesMax, 0) : sSeriesMax;
    if (aBounds[0] === undefined || aBounds[0] > sMin) aBounds[0] = sMin;
    if (aBounds[1] === undefined || aBounds[1] < sMax) aBounds[1] = sMax;
}

function roundAxisBounds(aBounds: number[]): void {
    if (aBounds[0] !== undefined) {
        aBounds[0] = Math.floor(aBounds[0] * 1000) / 1000;
        aBounds[1] = roundAxisMaximum(Math.ceil(aBounds[1] * 1000) / 1000);
    }
}

function getYAxisValues(
    aChartData: ChartSeriesItem[] | undefined,
    aAxes: PanelAxes,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [] as number[],
        right: [] as number[],
    };

    aChartData?.forEach((aItem) => {
        if (!aItem.data?.length) return;
        const sSeriesData = aItem.data as NonEmptyChartSeriesData;
        if (aItem.yAxis === 0) updateAxisBounds(sYAxis.left, sSeriesData, aAxes.zero_base);
        if (aItem.yAxis === 1) updateAxisBounds(sYAxis.right, sSeriesData, aAxes.zero_base2);
    });

    roundAxisBounds(sYAxis.left);
    roundAxisBounds(sYAxis.right);

    return sYAxis;
}

function resolveAxisRange(
    aManualRange: { min: number; max: number },
    aDefaultMin: number | undefined,
    aDefaultMax: number | undefined,
): AxisRange {
    if (aManualRange.min === 0 && aManualRange.max === 0) {
        return { min: aDefaultMin, max: aDefaultMax };
    }

    return { min: aManualRange.min, max: aManualRange.max };
}
