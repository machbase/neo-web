interface ComputeEventSeekRangeParams {
    eventTime: Date;
    currentStart: Date | null;
    currentEnd: Date | null;
    minTime?: Date | null;
    now?: Date;
    defaultWindowMs?: number;
}

export const DEFAULT_EVENT_WINDOW_MS = 60 * 60 * 1000;

const isValidDate = (value: Date | null | undefined): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

const getWindowMs = (currentStart: Date | null, currentEnd: Date | null, defaultWindowMs: number = DEFAULT_EVENT_WINDOW_MS): number => {
    if (isValidDate(currentStart) && isValidDate(currentEnd)) {
        const currentWindowMs = currentEnd.getTime() - currentStart.getTime();
        if (currentWindowMs > 0) {
            return currentWindowMs;
        }
    }
    return Math.max(0, defaultWindowMs);
};

export const isOutOfRange = (eventTime: Date, start: Date | null, end: Date | null): boolean => {
    if (!isValidDate(start) || !isValidDate(end)) {
        return true;
    }
    const startMs = start.getTime();
    const endMs = end.getTime();
    if (endMs < startMs) {
        return true;
    }
    const eventMs = eventTime.getTime();
    return eventMs < startMs || eventMs > endMs;
};

export const computeEventSeekRange = ({
    eventTime,
    currentStart,
    currentEnd,
    minTime,
    now = new Date(),
    defaultWindowMs = DEFAULT_EVENT_WINDOW_MS,
}: ComputeEventSeekRangeParams): { start: Date; end: Date } => {
    const windowMs = getWindowMs(currentStart, currentEnd, defaultWindowMs);
    const halfWindowMs = Math.floor(windowMs / 2);

    let startMs = eventTime.getTime() - halfWindowMs;
    let endMs = startMs + windowMs;

    const nowMs = now.getTime();
    const hasLowerBound = isValidDate(minTime);
    const lowerBoundMs = hasLowerBound ? minTime.getTime() : null;

    let upperBoundMs = nowMs;

    if (hasLowerBound && lowerBoundMs !== null && upperBoundMs < lowerBoundMs) {
        upperBoundMs = lowerBoundMs;
    }

    if (hasLowerBound && lowerBoundMs !== null && upperBoundMs - lowerBoundMs < windowMs) {
        return {
            start: new Date(lowerBoundMs),
            end: new Date(upperBoundMs),
        };
    }

    if (endMs > upperBoundMs) {
        endMs = upperBoundMs;
        startMs = endMs - windowMs;
    }

    if (hasLowerBound && lowerBoundMs !== null && startMs < lowerBoundMs) {
        startMs = lowerBoundMs;
        endMs = startMs + windowMs;
    }

    if (endMs < startMs) {
        endMs = startMs;
    }

    return {
        start: new Date(startMs),
        end: new Date(endMs),
    };
};
