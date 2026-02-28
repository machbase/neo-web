export const DEFAULT_FPS = 30;
export type SeekUnit = 'sec' | 'min' | 'hour' | 'frame';

const isValidDate = (value: Date | null | undefined): value is Date => {
    return value instanceof Date && !Number.isNaN(value.getTime());
};

export const resolveEffectiveFps = (fps: number | null | undefined): number => {
    return Number.isFinite(fps) && (fps as number) > 0 ? (fps as number) : DEFAULT_FPS;
};

export const getEventMarkerPercent = (eventTime: Date | null, rangeStart: Date | null, rangeEnd: Date | null): number | null => {
    if (!isValidDate(eventTime) || !isValidDate(rangeStart) || !isValidDate(rangeEnd)) return null;
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    const eventMs = eventTime.getTime();
    if (endMs <= startMs) return null;
    if (eventMs < startMs || eventMs > endMs) return null;
    return ((eventMs - startMs) / (endMs - startMs)) * 100;
};

export const buildEventCenteredRange = (eventTime: Date, rangeMs: number, now: Date = new Date()) => {
    const safeRangeMs = Math.max(0, rangeMs);
    const startMs = eventTime.getTime() - safeRangeMs;
    const endCandidateMs = eventTime.getTime() + safeRangeMs;
    const nowMs = now.getTime();
    const boundedEndMs = Math.min(endCandidateMs, nowMs);
    const endMs = Math.max(startMs, boundedEndMs);

    return {
        start: new Date(startMs),
        end: new Date(endMs),
    };
};

export const getEstimatedFrameOffset = (currentTime: Date | null, rangeStart: Date | null, fps: number | null | undefined): number => {
    if (!isValidDate(currentTime) || !isValidDate(rangeStart)) return 0;
    const diffMs = currentTime.getTime() - rangeStart.getTime();
    if (diffMs <= 0) return 0;
    const effectiveFps = resolveEffectiveFps(fps);
    return Math.max(0, Math.round((diffMs / 1000) * effectiveFps));
};

export const formatTimeWithMilliseconds = (date: Date | null): string => {
    if (!isValidDate(date)) return '--:--:--.---';
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${hour}:${minute}:${second}.${millis}`;
};

export const formatTimeForSeekUnit = (date: Date | null, seekUnit: SeekUnit): string => {
    if (!isValidDate(date)) {
        return seekUnit === 'frame' ? '--:--:--.---' : '--:--:--';
    }

    if (seekUnit === 'frame') {
        return formatTimeWithMilliseconds(date);
    }

    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${hour}:${minute}:${second}`;
};
