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
 * @param aSeriesData The non-empty series data to scan.
 * @returns The minimum and maximum y-values in the series.
 */
function getSeriesValueRange(aSeriesData: NonEmptyChartSeriesData): [number, number] {
    return aSeriesData.reduce<[number, number]>(
        (aSeriesValueRange, aChartRow) => {
            if (aChartRow[1] < aSeriesValueRange[0]) aSeriesValueRange[0] = aChartRow[1];
            if (aChartRow[1] > aSeriesValueRange[1]) aSeriesValueRange[1] = aChartRow[1];
            return aSeriesValueRange;
        },
        [aSeriesData[0][1], aSeriesData[0][1]],
    );
}

/**
 * Returns a rounded step size for the auto-generated y-axis ticks.
 * Intent: Keep the axis split values readable instead of using awkward fractional increments.
 * @param aAxisRangeValue The value used to derive the tick spacing.
 * @returns The rounded axis step size.
 */
function getRoundedAxisStep(aAxisRangeValue: number): number {
    const sReferenceValue = Math.max(
        Math.abs(aAxisRangeValue) / PANEL_Y_AXIS_SPLIT_COUNT,
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
 * @param aRawAxisMax The raw maximum value to round.
 * @returns The expanded display-friendly maximum value.
 */
function roundAxisMaximum(aRawAxisMax: number): number {
    if (!Number.isFinite(aRawAxisMax) || aRawAxisMax === 0) {
        return aRawAxisMax;
    }

    const sStep = getRoundedAxisStep(aRawAxisMax);
    const sRoundedValue = Math.ceil(aRawAxisMax / sStep) * sStep;
    const sExpandedValue =
        sRoundedValue > aRawAxisMax ? sRoundedValue : sRoundedValue + sStep;

    return Number(sExpandedValue.toPrecision(12));
}

/**
 * Extends a running `[min, max]` pair so it includes one more series.
 * Intent: Centralize zero-base handling while the auto-range logic scans each series.
 * @param aAxisBounds The running bounds array to update in place.
 * @param aSeriesData The non-empty series data to scan.
 * @param aZeroBase Whether zero should be included in the bounds.
 * @returns Nothing.
 */
function updateAxisBounds(
    aAxisBounds: number[],
    aSeriesData: NonEmptyChartSeriesData,
    aZeroBase: boolean,
): void {
    const [sSeriesMin, sSeriesMax] = getSeriesValueRange(aSeriesData);
    const sMin = aZeroBase ? Math.min(sSeriesMin, 0) : sSeriesMin;
    const sMax = aZeroBase ? Math.max(sSeriesMax, 0) : sSeriesMax;
    if (aAxisBounds[0] === undefined || aAxisBounds[0] > sMin) aAxisBounds[0] = sMin;
    if (aAxisBounds[1] === undefined || aAxisBounds[1] < sMax) aAxisBounds[1] = sMax;
}

/**
 * Rounds finalized axis bounds into display-friendly values.
 * Intent: Keep computed axis limits stable and readable before ECharts renders them.
 * @param aAxisBounds The running bounds array to finalize in place.
 * @returns Nothing.
 */
function roundAxisBounds(aAxisBounds: number[]): void {
    if (aAxisBounds[0] !== undefined) {
        aAxisBounds[0] = Math.floor(aAxisBounds[0] * 1000) / 1000;
        aAxisBounds[1] = roundAxisMaximum(Math.ceil(aAxisBounds[1] * 1000) / 1000);
    }
}

/**
 * Collects and rounds the left-axis and right-axis data ranges.
 * Intent: Separate per-axis value gathering from the higher-level y-axis option builder.
 * @param aChartData The chart datasets to scan.
 * @param aAxes The axis settings that control zero-base behavior.
 * @returns The computed left and right axis value maps.
 */
export function getYAxisValues(
    aChartData: ChartSeriesItem[],
    aAxes: PanelAxes,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [] as number[],
        right: [] as number[],
    };

    aChartData.forEach((aSeries) => {
        if (!aSeries.data?.length) return;
        const sSeriesData = aSeries.data as NonEmptyChartSeriesData;
        if (aSeries.yAxis === 0) {
            updateAxisBounds(
                sYAxis.left,
                sSeriesData,
                aAxes.left_y_axis.zero_base,
            );
        }
        if (aSeries.yAxis === 1) {
            updateAxisBounds(
                sYAxis.right,
                sSeriesData,
                aAxes.right_y_axis.zero_base,
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
 * @param aManualRange The configured manual range.
 * @param aDefaultMin The fallback minimum value.
 * @param aDefaultMax The fallback maximum value.
 * @returns The resolved axis range.
 */
export function resolveAxisRange(
    aManualRange: { min: number; max: number },
    aDefaultMin: number | undefined,
    aDefaultMax: number | undefined,
): ResolvedYAxisRange {
    if (aManualRange.min === 0 && aManualRange.max === 0) {
        return { min: aDefaultMin, max: aDefaultMax };
    }

    return { min: aManualRange.min, max: aManualRange.max };
}
