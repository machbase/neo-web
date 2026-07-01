import type { TimeRangeMs } from './TimeTypes';

export const SECOND_IN_MS = 1000;
export const MINUTE_IN_MS = 60 * SECOND_IN_MS;
export const HOUR_IN_MS = 60 * MINUTE_IN_MS;
export const DAY_IN_MS = 24 * HOUR_IN_MS;
export const NANOSECONDS_PER_MILLISECOND = 1000000;

export const EMPTY_TIME_RANGE: TimeRangeMs = { startTime: 0, endTime: 0 };

// Canonical date-time format shared by time-range parsing and editor input formatting.
export const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss';
