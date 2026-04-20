// Builds the ECharts x-axis and y-axis option objects that drive the panel chart
// and the shared y-axis range used by the overlap comparison chart.
//
// An "axis option" is the object ECharts reads to render a chart axis: its bounds,
// tick marks, labels, grid lines, and the pointer that follows the cursor.

import type {
    PanelAxes,
    PanelDisplay,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRange } from '../../utils/time/timeTypes';
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
import { formatAxisTime } from '../../utils/time/TimeRangeParsing';

// The overlap chart has no user-configured axes (no manual ranges, thresholds, or
// right-axis). This neutral template lets the shared y-axis bounds algorithm run
// against overlap data without any panel-specific settings bleeding in.
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
 * Builds the x-axis option objects for the main plot and navigator lane.
 * Intent: Keep both panel chart lanes locked to the same time range from one shared builder.
 *
 * An ECharts "x-axis option" tells the chart *how* to render the horizontal axis:
 * its time bounds, tick marks, labels, grid lines, and the pointer that follows the
 * cursor. The panel renders two vertically-stacked grids, so this function returns
 * two axis definitions:
 *   - gridIndex 0 — the main plot. Visible ticks, labels, and optional split lines.
 *   - gridIndex 1 — the navigator mini-map below the plot. Fully invisible, but
 *     still required so the navigator series can be positioned against the same
 *     time range as the main plot.
 *
 * Both axes share the same start and end time so the navigator's brush window
 * stays aligned with the main plot beneath it.
 *
 * @param aNavigatorRange The full time range covered by both the plot and the navigator.
 * @param aDisplay The display settings that decide whether vertical grid lines appear when zoom is active.
 * @param aAxes The panel axis settings controlling whether x-axis split lines are enabled.
 * @returns A two-entry ECharts x-axis option array (main plot + navigator).
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
 * Builds the y-axis option objects for the panel's main plot and navigator lane.
 * Intent: Centralize axis-range selection so raw, normalized, and manual ranges stay consistent.
 *
 * A panel chart has three y-axes across its two stacked grids:
 *   - gridIndex 0, left — the primary value axis (yAxis 0 series bind here).
 *   - gridIndex 0, right — the secondary value axis (yAxis 1 series bind here),
 *     flipped to the right side when `use_right_y2` is on, otherwise drawn on
 *     the left behind the primary axis.
 *   - gridIndex 1 — an invisible axis for the navigator series below.
 *
 * Each visible axis uses the user's manually configured range when one is set,
 * otherwise the range is computed from the data (rounded for nicer tick values).
 * Raw mode and normalize mode each swap in a different range source.
 *
 * @param aAxes The panel axis settings used to size and decorate the y-axes.
 * @param aChartData The visible chart datasets used to derive axis ranges.
 * @param aIsRaw Whether the chart is currently showing raw data (switches to the drilldown ranges).
 * @param aUseNormalize Whether right-axis normalization is on (forces the right axis to [0, 100]).
 * @returns A three-entry ECharts y-axis option array (left, right, navigator).
 */
export function buildPanelYAxisOption(
    aAxes: PanelAxes,
    aChartData: ChartSeriesItem[],
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
                show: aChartData.some((aItem) => aItem.yAxis === 1),
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
 * Computes the shared y-axis range used by the overlap comparison chart.
 * Intent: Reuse the panel y-axis range logic without leaking panel-only settings into overlap mode.
 *
 * The overlap chart stacks several panels onto a single shared y-axis so their
 * trends can be compared side-by-side. Unlike a regular panel, it has no manual
 * range, no thresholds, and no right-axis — so we run the same value-scanning
 * logic used for the panel y-axis, but with a neutral axes template that
 * disables every panel-specific feature. Only the left-axis min/max is returned
 * because the overlap chart uses one unified axis.
 *
 * @param aChartData The datasets currently shown on the overlap chart.
 * @param aZeroBase When true, zero is forced into the returned range so the baseline stays visible.
 * @returns The shared y-axis min/max for the overlap chart.
 */
export function resolveOverlapYAxisRange(
    aChartData: ChartSeriesItem[],
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

/**
 * Returns the lowest and highest y-values in a single series.
 * Intent: Give the axis-range helpers a reusable primitive for scanning one series at a time.
 * @param aSeriesData The non-empty series data to scan.
 * @returns The minimum and maximum y-values in the series.
 */
function getSeriesValueRange(aSeriesData: NonEmptyChartSeriesData): [number, number] {
    return aSeriesData.reduce<[number, number]>(
        (aResult, aCurrent) => {
            if (aCurrent[1] < aResult[0]) aResult[0] = aCurrent[1];
            if (aCurrent[1] > aResult[1]) aResult[1] = aCurrent[1];
            return aResult;
        },
        [aSeriesData[0][1], aSeriesData[0][1]],
    );
}

// Picks a "nice" step size — 1, 2, or 5 multiplied by a power of ten —
// that cleanly divides the axis into PANEL_Y_AXIS_SPLIT_COUNT sections.
/**
 * Returns a rounded step size for the auto-generated y-axis ticks.
 * Intent: Keep the axis split values readable instead of using awkward fractional increments.
 * @param aValue The value used to derive the tick spacing.
 * @returns The rounded axis step size.
 */
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

// Rounds the y-axis maximum up to the next nice step so the top series never
// touches the top edge of the plot, leaving visible headroom above the data.
/**
 * Rounds an axis maximum up to the next display-friendly step.
 * Intent: Leave visible headroom above the highest data point instead of letting it touch the chart edge.
 * @param aValue The raw maximum value to round.
 * @returns The expanded display-friendly maximum value.
 */
function roundAxisMaximum(aValue: number): number {
    if (!Number.isFinite(aValue) || aValue === 0) {
        return aValue;
    }

    const sStep = getRoundedAxisStep(aValue);
    const sRoundedValue = Math.ceil(aValue / sStep) * sStep;
    const sExpandedValue = sRoundedValue > aValue ? sRoundedValue : sRoundedValue + sStep;

    return Number(sExpandedValue.toPrecision(12));
}

// Widens a running `[min, max]` pair in place so it covers one more series.
// When `aZeroBase` is true, zero is also pulled into the range so the axis
// baseline is guaranteed to be visible.
/**
 * Extends a running `[min, max]` pair so it includes one more series.
 * Intent: Centralize zero-base handling while the auto-range logic scans each series.
 * @param aBounds The running bounds array to update in place.
 * @param aSeriesData The non-empty series data to scan.
 * @param aZeroBase Whether zero should be included in the bounds.
 * @returns Nothing.
 */
function updateAxisBounds(
    aBounds: number[],
    aSeriesData: NonEmptyChartSeriesData,
    aZeroBase: boolean,
): void {
    const [sSeriesMin, sSeriesMax] = getSeriesValueRange(aSeriesData);
    const sMin = aZeroBase ? Math.min(sSeriesMin, 0) : sSeriesMin;
    const sMax = aZeroBase ? Math.max(sSeriesMax, 0) : sSeriesMax;
    if (aBounds[0] === undefined || aBounds[0] > sMin) aBounds[0] = sMin;
    if (aBounds[1] === undefined || aBounds[1] < sMax) aBounds[1] = sMax;
}

// Finalizes a `[min, max]` pair for display: the min is floored to three
// decimals, the max is ceiled then expanded to the nearest nice step.
/**
 * Rounds finalized axis bounds into display-friendly values.
 * Intent: Keep computed axis limits stable and readable before ECharts renders them.
 * @param aBounds The running bounds array to finalize in place.
 * @returns Nothing.
 */
function roundAxisBounds(aBounds: number[]): void {
    if (aBounds[0] !== undefined) {
        aBounds[0] = Math.floor(aBounds[0] * 1000) / 1000;
        aBounds[1] = roundAxisMaximum(Math.ceil(aBounds[1] * 1000) / 1000);
    }
}

// Splits every series onto its assigned axis (left = 0, right = 1), collapses
// each pile into a single `[min, max]` pair, and then rounds both pairs for
// display. Empty series are skipped.
/**
 * Collects and rounds the left-axis and right-axis data ranges.
 * Intent: Separate per-axis value gathering from the higher-level y-axis option builder.
 * @param aChartData The chart datasets to scan.
 * @param aAxes The axis settings that control zero-base behavior.
 * @returns The computed left and right axis value maps.
 */
function getYAxisValues(
    aChartData: ChartSeriesItem[],
    aAxes: PanelAxes,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [] as number[],
        right: [] as number[],
    };

    aChartData.forEach((aItem) => {
        if (!aItem.data?.length) return;
        const sSeriesData = aItem.data as NonEmptyChartSeriesData;
        if (aItem.yAxis === 0) updateAxisBounds(sYAxis.left, sSeriesData, aAxes.zero_base);
        if (aItem.yAxis === 1) updateAxisBounds(sYAxis.right, sSeriesData, aAxes.zero_base2);
    });

    roundAxisBounds(sYAxis.left);
    roundAxisBounds(sYAxis.right);

    return sYAxis;
}

// Returns the user's manually configured axis range when one is set, otherwise
// falls back to the data-driven defaults. A manual range of `[0, 0]` is the
// sentinel for "not configured" and triggers the fallback.
/**
 * Returns the manual axis range when one is configured, otherwise the computed fallback.
 * Intent: Preserve explicit user limits without repeating the sentinel-range check in every caller.
 * @param aManualRange The configured manual range.
 * @param aDefaultMin The fallback minimum value.
 * @param aDefaultMax The fallback maximum value.
 * @returns The resolved axis range.
 */
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
