import type { QuickTimeRangeOption } from '@/design-system/components';
import { TIME_RANGE } from '@/utils/constants';

export const TIME_RANGE_PRESETS: QuickTimeRangeOption[][] = [
    ...TIME_RANGE,
    createFirstTimeRangePresets(),
];

// -------------------- Local --------------------

function createFirstTimeRangePresets(): QuickTimeRangeOption[] {
    const durations = [
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

    return durations.map(([duration, label]) => {
        const end = `first+${duration}`;

        return {
            key: end,
            name: `First ${label} of data`,
            value: ['first', end],
        };
    });
}
