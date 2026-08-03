import type { QuickTimeRangeOption } from '@/design-system/components';
import { TIME_RANGE } from '@/utils/constants';

const FIRST_DATA_DURATIONS = [
    ['5 seconds', '5s'],
    ['10 seconds', '10s'],
    ['5 minutes', '5m'],
    ['10 minutes', '10m'],
    ['1 hour', '1h'],
    ['3 hours', '3h'],
    ['1 day', '1d'],
    ['3 days', '3d'],
    ['1 month', '1M'],
    ['1 year', '1y'],
] as const;

const FIRST_DATA_TIME_RANGES: QuickTimeRangeOption[] =
    FIRST_DATA_DURATIONS.map(([label, duration]) => ({
        key: `first-data-${duration}`,
        name: `First ${label} of data`,
        value: ['first', `first+${duration}`],
    }));

export const TAG_ANALYZER_TIME_RANGE_OPTIONS: QuickTimeRangeOption[][] = [
    TIME_RANGE[0],
    FIRST_DATA_TIME_RANGES,
    ...TIME_RANGE.slice(1),
];
