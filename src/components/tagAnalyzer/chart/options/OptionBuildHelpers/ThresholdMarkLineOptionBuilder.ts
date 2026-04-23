type ThresholdLineOption = {
    silent: true;
    symbol: 'none';
    lineStyle: {
        color: string;
        width: number;
    };
    label: {
        show: false;
    };
    data: Array<{
        yAxis: number;
    }>;
};

/**
 * Builds a threshold mark-line definition.
 * Intent: Keep threshold-line construction consistent for both left and right axes.
 * @param aThresholdColor The threshold line color.
 * @param aThresholdValue The threshold value to render.
 * @returns The mark-line option.
 */
export function buildThresholdLineOption(
    aThresholdColor: string,
    aThresholdValue: number,
): ThresholdLineOption {
    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: aThresholdColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: aThresholdValue }],
    };
}
