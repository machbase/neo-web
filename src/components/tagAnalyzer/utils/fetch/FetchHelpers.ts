/**
 * Resolves a table name into its qualified form.
 * Intent: Ensure unqualified tables are routed through the admin schema expected by the fetch API.
 *
 * @param aTable The table name to qualify.
 * @param aAdminId The admin schema prefix to apply when the table is unqualified.
 * @returns The qualified table name.
 */
export function getQualifiedTableName(aTable: string, aAdminId: string): string {
    const sParts = aTable.split('.');
    if (sParts.length > 1) {
        return aTable;
    }

    return `${aAdminId.toUpperCase()}.${aTable}`;
}

/**
 * Calculates the number of samples to request for a chart.
 * Intent: Keep the sampling decision consistent between raw and calculated panel fetches.
 *
 * @param aLimit The current fetch limit value.
 * @param aUseSampling Whether sampling is enabled for the request.
 * @param aIsRaw Whether the request is loading raw data.
 * @param aPixelsPerTick The sampling density for calculated data.
 * @param aPixelsPerTickRaw The sampling density for raw data.
 * @param aChartWidth The visible chart width in pixels.
 * @returns The sample count to request, or -1 when sampling is not needed.
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
