/**
 * Calculates the number of samples to request for a chart.
 * Intent: Keep the sampling decision consistent between raw and calculated panel fetches.
 * @param {number} aLimit - The current fetch limit value.
 * @param {boolean} aUseSampling - Whether sampling is enabled for the request.
 * @param {boolean} aIsRaw - Whether the request is loading raw data.
 * @param {number} aPixelsPerTick - The sampling density for calculated data.
 * @param {number} aPixelsPerTickRaw - The sampling density for raw data.
 * @param {number} aChartWidth - The visible chart width in pixels.
 * @returns {number} The sample count to request, or -1 when sampling is not needed.
 */
export function calculateSampleCount(
    aLimit: number,
    aUseSampling: boolean,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aChartWidth: number,
): number {
    if (aLimit >= 0) {
        return -1;
    }

    const sPixelsPerTick =
        aUseSampling && aIsRaw
            ? aPixelsPerTickRaw > 0
                ? aPixelsPerTickRaw
                : 1
            : aPixelsPerTick > 0
              ? aPixelsPerTick
              : 1;

    return Math.ceil(aChartWidth / sPixelsPerTick);
}
