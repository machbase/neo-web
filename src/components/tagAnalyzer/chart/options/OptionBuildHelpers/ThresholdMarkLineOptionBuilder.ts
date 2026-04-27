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
 * @param thresholdColor The threshold line color.
 * @param thresholdValue The threshold value to render.
 * @returns The mark-line option.
 */
export function buildThresholdLineOption(
    thresholdColor: string,
    thresholdValue: number,
): ThresholdLineOption {
    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: thresholdColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: thresholdValue }],
    };
}
