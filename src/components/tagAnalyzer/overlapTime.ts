const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

export const formatOverlapElapsedTime = (aElapsedMs: number | string, aTickInterval?: number): string => {
    const sElapsedMs = Number(aElapsedMs);
    if (!Number.isFinite(sElapsedMs)) return String(aElapsedMs);

    const sSign = sElapsedMs < 0 ? '-' : '';
    const sAbsMs = Math.floor(Math.abs(sElapsedMs));
    const sHours = Math.floor(sAbsMs / HOUR_MS);
    const sMinutes = Math.floor((sAbsMs % HOUR_MS) / MINUTE_MS);
    const sSeconds = Math.floor((sAbsMs % MINUTE_MS) / SECOND_MS);
    const sMilliseconds = sAbsMs % SECOND_MS;
    const sBase = `${sSign}${pad(sHours)}:${pad(sMinutes)}`;

    if (aTickInterval !== undefined && aTickInterval < SECOND_MS) return `${sBase}:${pad(sSeconds)}.${pad(sMilliseconds, 3)}`;
    if (aTickInterval !== undefined && aTickInterval < MINUTE_MS) return `${sBase}:${pad(sSeconds)}`;

    return sBase;
};
