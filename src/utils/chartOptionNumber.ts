import { DefaultLiquidfillChartOption } from '@/utils/eChartHelper';

/**
 * A numeric chart option as the chart code may use it. The option inputs are type="number" fields
 * that store '' once cleared, and that '' used to land unquoted in the generated option JSON or
 * chart script — a Gauge with an empty Min never drew, a Liquid fill with one vanished (#1561).
 * An empty or non-numeric value falls back to the chart type's default.
 */
export const chartOptionNumber = (aValue: unknown, aFallback: number): number => {
    if (aValue === '' || aValue === null || aValue === undefined) return aFallback;
    const sNumber = Number(aValue);
    return Number.isFinite(sNumber) ? sNumber : aFallback;
};

/**
 * The Liquid fill ratio as chart-script source, for the value held in `aValueVar`. Min and Max are
 * written in as numbers (an empty one used to leave `(sValue - ) / ( - )` behind, a syntax error
 * that took the whole panel down), and Min = Max no longer divides by zero: the fill is full once
 * the value reaches that one point and empty below it.
 */
export const liquidFillRatioCode = (aValueVar: string, aMinData: unknown, aMaxData: unknown): string => {
    const sMin = chartOptionNumber(aMinData, DefaultLiquidfillChartOption.minData);
    const sMax = chartOptionNumber(aMaxData, DefaultLiquidfillChartOption.maxData);
    if (sMax === sMin) return `[ ${aValueVar} >= ${sMin} ? 1 : 0 ]`;
    return `[ (${aValueVar} - ${sMin}) / ( ${sMax} -  ${sMin}) ]`;
};
