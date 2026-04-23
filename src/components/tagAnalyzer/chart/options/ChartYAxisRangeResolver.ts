import type { PanelAxes } from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type {
    NonEmptyChartSeriesData,
    YAxisValueMap,
} from './ChartOptionTypes';
import { PANEL_Y_AXIS_SPLIT_COUNT } from './ChartOptionConstants';

export type ResolvedYAxisRange = {
    min: number | undefined;
    max: number | undefined;
};

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

    aChartData.forEach((aItem) => {
        if (!aItem.data?.length) return;
        const sSeriesData = aItem.data as NonEmptyChartSeriesData;
        if (aItem.yAxis === 0) {
            updateAxisBounds(
                sYAxis.left,
                sSeriesData,
                aAxes.left_y_axis.zero_base,
            );
        }
        if (aItem.yAxis === 1) {
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
