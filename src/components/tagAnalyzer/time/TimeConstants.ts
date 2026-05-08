import type { ResolvedTimeRangeMs } from './TimeTypes';

export const SECOND_IN_MS = 1000;
export const MINUTE_IN_MS = 60 * SECOND_IN_MS;
export const HOUR_IN_MS = 60 * MINUTE_IN_MS;
export const DAY_IN_MS = 24 * HOUR_IN_MS;
export const WEEK_IN_MS = 7 * DAY_IN_MS;
export const MONTH_IN_MS = 30 * DAY_IN_MS;
export const YEAR_IN_MS = 365 * DAY_IN_MS;
export const NANOSECONDS_PER_MILLISECOND = 1000000;
export const NANOSECONDS_PER_SECOND = 1000 * NANOSECONDS_PER_MILLISECOND;

export const EMPTY_TIME_RANGE: ResolvedTimeRangeMs = { startTime: 0, endTime: 0 };
