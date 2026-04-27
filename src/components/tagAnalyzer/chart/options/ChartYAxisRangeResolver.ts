import type { PanelAxes } from '../../utils/panelModelTypes';
import type { ChartRow, ChartSeriesItem } from '../../utils/series/PanelSeriesTypes';
import { PANEL_Y_AXIS_SPLIT_COUNT } from './ChartOptionConstants';

export type ResolvedYAxisRange = {
    min: number | undefined;
    max: number | undefined;
};

type NonEmptyChartSeriesData = [ChartRow, ...ChartRow[]];

type YAxisValueMap = {
    left: number[];
    right: number[];
};

/**
 * Returns the lowest and highest y-values in a single series.
 * Intent: Give the axis-range helpers a reusable primitive for scanning one series at a time.
 * @param seriesData The non-empty series data to scan.
 * @returns The minimum and maximum y-values in the series.
 */
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

/**
 * Returns a rounded step size for the auto-generated y-axis ticks.
 * Intent: Keep the axis split values readable instead of using awkward fractional increments.
 * @param axisRangeValue The value used to derive the tick spacing.
 * @returns The rounded axis step size.
 */
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

/**
 * Rounds an axis maximum up to the next display-friendly step.
 * Intent: Leave visible headroom above the highest data point instead of letting it touch the chart edge.
 * @param rawAxisMax The raw maximum value to round.
 * @returns The expanded display-friendly maximum value.
 */
function roundAxisMaximum(rawAxisMax: number): number {
    if (!Number.isFinite(rawAxisMax) || rawAxisMax === 0) {
        return rawAxisMax;
    }

    const sStep = getRoundedAxisStep(rawAxisMax);
    const sRoundedValue = Math.ceil(rawAxisMax / sStep) * sStep;
    const sExpandedValue =
        sRoundedValue > rawAxisMax ? sRoundedValue : sRoundedValue + sStep;

    return Number(sExpandedValue.toPrecision(12));
}

/**
 * Extends a running `[min, max]` pair so it includes one more series.
 * Intent: Centralize zero-base handling while the auto-range logic scans each series.
 * @param axisBounds The running bounds array to update in place.
 * @param seriesData The non-empty series data to scan.
 * @param zeroBase Whether zero should be included in the bounds.
 * @returns Nothing.
 */
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

/**
 * Rounds finalized axis bounds into display-friendly values.
 * Intent: Keep computed axis limits stable and readable before ECharts renders them.
 * @param axisBounds The running bounds array to finalize in place.
 * @returns Nothing.
 */
function roundAxisBounds(axisBounds: number[]): void {
    if (axisBounds[0] !== undefined) {
        axisBounds[0] = Math.floor(axisBounds[0] * 1000) / 1000;
        axisBounds[1] = roundAxisMaximum(Math.ceil(axisBounds[1] * 1000) / 1000);
    }
}

/**
 * Collects and rounds the left-axis and right-axis data ranges.
 * Intent: Separate per-axis value gathering from the higher-level y-axis option builder.
 * @param chartData The chart datasets to scan.
 * @param axes The axis settings that control zero-base behavior.
 * @returns The computed left and right axis value maps.
 */
export function getYAxisValues(
    chartData: ChartSeriesItem[],
    axes: PanelAxes,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [] as number[],
        right: [] as number[],
    };

    chartData.forEach((series) => {
        if (!series.data?.length) return;
        const sSeriesData = series.data as NonEmptyChartSeriesData;
        if (series.yAxis === 0) {
            updateAxisBounds(
                sYAxis.left,
                sSeriesData,
                axes.left_y_axis.zero_base,
            );
        }
        if (series.yAxis === 1) {
            updateAxisBounds(
                sYAxis.right,
                sSeriesData,
                axes.right_y_axis.zero_base,
            );
        }
    });

    roundAxisBounds(sYAxis.left);
    roundAxisBounds(sYAxis.right);

    return sYAxis;
}

/**
 * Returns the manual axis range when one is configured, otherwise the computed fallback.
 * Intent: Preserve explicit user limits without repeating the sentinel-range check in every caller.
 * @param manualRange The configured manual range.
 * @param defaultMin The fallback minimum value.
 * @param defaultMax The fallback maximum value.
 * @returns The resolved axis range.
 */
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
