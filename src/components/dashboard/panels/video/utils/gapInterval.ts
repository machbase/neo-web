/**
 * Determine data gap query interval(seconds) by selected time range.
 * Keep this function centralized so policy updates are applied globally.
 */
export function getDataGapIntervalSeconds(start: Date, end: Date): number {
    const durationMs = end.getTime() - start.getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) return 8;

    const hourMs = 60 * 60 * 1000;

    if (durationMs <= hourMs) return 8;
    if (durationMs <= 3 * hourMs) return 15;
    if (durationMs <= 12 * hourMs) return 60;
    if (durationMs <= 24 * hourMs) return 120;
    if (durationMs <= 3 * 24 * hourMs) return 300;
    return 900;
}
