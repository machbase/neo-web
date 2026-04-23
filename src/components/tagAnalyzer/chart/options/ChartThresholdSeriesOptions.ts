import type { ThresholdLineOption } from './ChartOptionTypes';

/**
 * Builds a threshold mark-line definition when that threshold is enabled.
 * Intent: Keep threshold-line construction consistent for both left and right axes.
 * @param aUseFlag Whether the threshold should be enabled.
 * @param aColor The threshold line color.
 * @param aValue The threshold value to render.
 * @returns The mark-line option when the threshold is enabled, otherwise `undefined`.
 */
export function buildThresholdLine(
    aUseFlag: boolean,
    aColor: string,
    aValue: number,
): ThresholdLineOption | undefined {
    if (!aUseFlag) {
        return undefined;
    }

    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: aColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: aValue }],
    };
}
