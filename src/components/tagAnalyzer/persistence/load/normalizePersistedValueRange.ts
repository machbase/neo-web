import {
    AUTO_VALUE_RANGE,
    type ValueRange,
} from '../../domain/panel/PanelConfig';
import { asRecord } from '../../domain/ObjectGuards';

export function normalizePersistedValueRange(
    valueRange: unknown,
): ValueRange | undefined {
    const sValueRange = asRecord(valueRange);
    if (!sValueRange) {
        return undefined;
    }

    const sMin = sValueRange.min;
    const sMax = sValueRange.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;

    if (!sHasMin && !sHasMax) {
        return { ...AUTO_VALUE_RANGE };
    }

    if (sHasMin !== sHasMax) {
        return undefined;
    }

    if (typeof sMin !== 'number' || typeof sMax !== 'number') {
        return undefined;
    }

    if (!Number.isFinite(sMin) || !Number.isFinite(sMax)) {
        return undefined;
    }

    if (sMin === 0 && sMax === 0) {
        return { ...AUTO_VALUE_RANGE };
    }

    if (sMin >= sMax) {
        return undefined;
    }

    return {
        min: sMin,
        max: sMax,
    };
}

export function normalizePersistedValueRangeOrAuto(
    valueRange: unknown,
): ValueRange {
    return normalizePersistedValueRange(valueRange) ?? { ...AUTO_VALUE_RANGE };
}