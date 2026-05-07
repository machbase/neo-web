import type { IntervalOption } from '../time/TimeTypes';

export function hasResolvedIntervalOption(
    intervalOption: IntervalOption | undefined,
): boolean {
    if (!intervalOption) {
        return false;
    }

    return intervalOption.IntervalType !== '' && intervalOption.IntervalValue > 0;
}
