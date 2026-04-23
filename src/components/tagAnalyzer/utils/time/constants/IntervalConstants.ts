import { TimeUnit } from '../types/TimeTypes';
import type { IntervalRule, TimeUnitOption } from '../types/IntervalTypes';

export const SECOND_IN_MS = 1000;
export const MINUTE_IN_MS = 60 * SECOND_IN_MS;
export const HOUR_IN_MS = 60 * MINUTE_IN_MS;
export const DAY_IN_MS = 24 * HOUR_IN_MS;
export const WEEK_IN_MS = 7 * DAY_IN_MS;

export const INTERVAL_RULES: IntervalRule[] = [
    {
        limit: 60 * 60 * 12,
        buildIntervalSpec: (aCalc) => ({
            type: TimeUnit.Day,
            value: Math.ceil(aCalc / (60 * 60 * 24)),
        }),
    },
    {
        limit: 60 * 60 * 6,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 12,
        }),
    },
    {
        limit: 60 * 60 * 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 6,
        }),
    },
    {
        limit: 60 * 60,
        buildIntervalSpec: (aCalc) => ({
            type: TimeUnit.Hour,
            value: Math.ceil(aCalc / (60 * 60)),
        }),
    },
    {
        limit: 60 * 30,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 1,
        }),
    },
    {
        limit: 60 * 20,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 30,
        }),
    },
    {
        limit: 60 * 15,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 20,
        }),
    },
    {
        limit: 60 * 10,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 15,
        }),
    },
    {
        limit: 60 * 5,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 10,
        }),
    },
    {
        limit: 60 * 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 5,
        }),
    },
    {
        limit: 60,
        buildIntervalSpec: (aCalc) => ({
            type: TimeUnit.Minute,
            value: Math.ceil(aCalc / 60),
        }),
    },
    {
        limit: 30,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 1,
        }),
    },
    {
        limit: 20,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 30,
        }),
    },
    {
        limit: 15,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 20,
        }),
    },
    {
        limit: 10,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 15,
        }),
    },
    {
        limit: 5,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 10,
        }),
    },
    {
        limit: 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 5,
        }),
    },
];

export const SHIFT_TIME_UNIT_OPTIONS: TimeUnitOption[] = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
    TimeUnit.Day,
].map((aUnit) => ({
    value: aUnit,
    label: aUnit,
    disabled: undefined,
}));
