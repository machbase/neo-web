import type { IntervalOption } from './TimeTypes';

export function hasResolvedIntervalOption(
    intervalOption: IntervalOption | undefined,
): intervalOption is IntervalOption {
    if (!intervalOption) {
        return false;
    }

    return intervalOption.IntervalType !== '' && intervalOption.IntervalValue > 0;
}
