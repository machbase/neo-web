// Blackbox Time Utilities

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Parse timestamp string to Date
 */
export function parseTimestamp(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    const normalized = typeof value === 'string' ? value.trim() : String(value);
    if (!normalized) return null;
    const iso = normalized.includes('T') ? normalized : normalized.replace(' ', 'T');
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format Date to ISO string with milliseconds
 */
export function formatIsoWithMs(date: Date | null): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}`;
}

/**
 * Format ISO string to KST display format
 */
export function formatKST(isoString: string | null): string {
    if (!isoString) return '';
    const sourceDate = parseTimestamp(isoString);
    if (!(sourceDate instanceof Date) || Number.isNaN(sourceDate.getTime())) return '';
    const utcMs = sourceDate.getTime();
    const kstDate = new Date(utcMs + KST_OFFSET_MS);
    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getUTCDate()).padStart(2, '0');
    const hour = String(kstDate.getUTCHours()).padStart(2, '0');
    const minute = String(kstDate.getUTCMinutes()).padStart(2, '0');
    const second = String(kstDate.getUTCSeconds()).padStart(2, '0');
    const millis = String(kstDate.getUTCMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millis}`;
}

/**
 * Format time label (HH:mm:ss) - no milliseconds
 */
export function formatTimeLabel(date: Date | null): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--:--:--';
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${hour}:${minute}:${second}`;
}

/**
 * Convert Date to local input value (for datetime-local input)
 */
export function toLocalInputValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

/**
 * Convert Date to KST ISO string (seconds precision)
 */
export function toKstISOStringSeconds(date: Date | null): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const kst = new Date(date.getTime() + KST_OFFSET_MS);
    const y = kst.getUTCFullYear();
    const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const d = String(kst.getUTCDate()).padStart(2, '0');
    const hh = String(kst.getUTCHours()).padStart(2, '0');
    const mm = String(kst.getUTCMinutes()).padStart(2, '0');
    const ss = String(kst.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

/**
 * Calculate seconds between two dates
 */
export function secondsBetween(a: Date, b: Date): number {
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));
}

/**
 * Convert Date to Unix nanoseconds (as BigInt)
 */
export function dateToUnixNano(date: Date | null): bigint | null {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    try {
        const millis = BigInt(Math.round(date.getTime()));
        return millis * 1000000n;
    } catch {
        return null;
    }
}

/**
 * Get frame duration in milliseconds based on FPS
 */
export function getFrameDurationMs(fps: number | null): number {
    if (fps && fps > 0) {
        return 1000 / fps;
    }
    // Default to 30 FPS
    return 1000 / 30;
}

/**
 * Get slider step in milliseconds based on FPS
 */
export function getSliderStepMs(fps: number | null): number {
    if (fps && fps > 0) {
        return Math.max(1, Math.round(1000 / fps));
    }
    return Math.max(1, Math.round(1000 / 30));
}
