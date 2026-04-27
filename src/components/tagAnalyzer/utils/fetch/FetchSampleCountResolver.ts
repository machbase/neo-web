/**
 * Calculates the number of samples to request for a chart.
 * Intent: Keep the sampling decision consistent between raw and calculated panel fetches.
 * @param {number} limit - The current fetch limit value.
 * @param {boolean} useSampling - Whether sampling is enabled for the request.
 * @param {boolean} isRaw - Whether the request is loading raw data.
 * @param {number} pixelsPerTick - The sampling density for calculated data.
 * @param {number} pixelsPerTickRaw - The sampling density for raw data.
 * @param {number} chartWidth - The visible chart width in pixels.
 * @returns {number} The sample count to request, or -1 when sampling is not needed.
 */
export function calculateSampleCount(
    limit: number,
    useSampling: boolean,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    chartWidth: number,
): number {
    if (limit >= 0) {
        return -1;
    }

    const sPixelsPerTick =
        useSampling && isRaw
            ? pixelsPerTickRaw > 0
                ? pixelsPerTickRaw
                : 1
            : pixelsPerTick > 0
              ? pixelsPerTick
              : 1;

    return Math.ceil(chartWidth / sPixelsPerTick);
}
