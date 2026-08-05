import { isPlainObject } from '../objectGuards';
import type { RangeState } from '../range/rangeModel';
import {
    decodeAxisRange,
    encodeAxisRange,
    type PersistedAxisRange,
} from './serializeRange';

export type PersistedPanelRangeState = {
    panelRange: PersistedAxisRange;
    navigatorRange: PersistedAxisRange;
};

export function decodePersistedPanelRangeState(
    value: unknown,
): RangeState | undefined {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const mainRange = decodeAxisRange(value.panelRange);
    const navigatorRange = decodeAxisRange(value.navigatorRange);

    if (!mainRange || !navigatorRange) {
        return undefined;
    }

    return { mainRange, navigatorRange };
}

export function encodePersistedPanelRangeState(
    range: RangeState,
): PersistedPanelRangeState {
    return {
        panelRange: encodeAxisRange(range.mainRange),
        navigatorRange: encodeAxisRange(range.navigatorRange),
    };
}
