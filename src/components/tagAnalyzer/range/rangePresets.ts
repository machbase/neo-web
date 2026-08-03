import type { QuickTimeRangeOption } from '@/design-system/components';
import { TIME_RANGE } from '@/utils/constants';

const FIRST_TIME_RANGE_DURATIONS = [
    ['5s', '5 seconds'],
    ['10s', '10 seconds'],
    ['5m', '5 minutes'],
    ['10m', '10 minutes'],
    ['1h', '1 hour'],
    ['3h', '3 hours'],
    ['1d', '1 day'],
    ['3d', '3 days'],
    ['1M', '1 month'],
    ['1y', '1 year'],
] as const;
const NUMERIC_RANGE_SIZES = [
    [10, '10'],
    [100, '100'],
    [1_000, '1000'],
    [10_000, '10k'],
    [100_000, '100k'],
    [1_000_000, '1m'],
    [10_000_000, '10m'],
] as const;

const FIRST_TIME_RANGE_PRESETS: QuickTimeRangeOption[] =
    FIRST_TIME_RANGE_DURATIONS.map(([duration, label]) => {
        const end = `first+${duration}`;

        return {
            key: end,
            name: `First ${label} of data`,
            value: ['first', end],
        };
    });

function createNumericRangePresets(
    anchor: 'first' | 'last',
): QuickTimeRangeOption[] {
    const label = anchor === 'first' ? 'First' : 'Last';

    return NUMERIC_RANGE_SIZES.map(([size, sizeLabel]) => {
        const offset = `${anchor}-${size}`;

        return {
            key: offset,
            name: `${label} ${sizeLabel}`,
            value: anchor === 'first'
                ? [anchor, offset]
                : [offset, anchor],
        };
    });
}

export const TIME_RANGE_PRESETS: QuickTimeRangeOption[][] = [
    ...TIME_RANGE,
    FIRST_TIME_RANGE_PRESETS,
];

export const NUMERIC_RANGE_PRESETS: QuickTimeRangeOption[][] = [
    createNumericRangePresets('first'),
    createNumericRangePresets('last'),
];
