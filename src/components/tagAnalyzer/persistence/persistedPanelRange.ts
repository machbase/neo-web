import { isPlainObject } from '../objectGuards';
import type { AxisRange, PanelRangeState } from '../range/rangeModel';

export function decodePersistedPanelRangeState(
    value: unknown,
): PanelRangeState | undefined {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const panelRange: AxisRange | undefined = decodePersistedAxisRange(
        value.panelRange,
    );
    const navigatorRange: AxisRange | undefined = decodePersistedAxisRange(
        value.navigatorRange,
    );

    return panelRange && navigatorRange
        ? { panelRange, navigatorRange }
        : undefined;
}

function decodePersistedAxisRange(value: unknown): AxisRange | undefined {
    if (
        !isPlainObject(value) ||
        typeof value.startTime !== 'number' ||
        typeof value.endTime !== 'number'
    ) {
        return undefined;
    }

    return {
        startTime: value.startTime,
        endTime: value.endTime,
    };
}
