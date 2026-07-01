import { TimeUnit, type TimeRangeInput } from '../../domain/time/TimeTypes';
import {
    formatAbsoluteTimeExpression,
    formatRelativeTimeExpression,
} from '../../domain/time/TimeRangeInputResolver';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeIntervalUtils';
import { asRecord } from '../../domain/ObjectGuards';

// Board time range persists as raw expression strings (TAZ 2.1.0): { start, end }
// where each side is "now", "now-1h", "last-2d", an absolute "YYYY-MM-DD HH:mm:ss",
// or "" (empty). Older files stored each side as a structured time-range object;
// those are converted to the equivalent expression string here so they still load.
export function normalizePersistedTimeRangeInput(
    rangeConfig: unknown,
): TimeRangeInput | undefined {
    const sRangeConfig = asRecord(rangeConfig);
    if (!sRangeConfig) {
        return undefined;
    }

    const sStart = normalizePersistedTimeExpression(sRangeConfig.start);
    const sEnd = normalizePersistedTimeExpression(sRangeConfig.end);

    if (sStart === undefined || sEnd === undefined) {
        return undefined;
    }

    return { start: sStart, end: sEnd };
}

export function createTimeRangeInputFromStoredValues(
    startValue: string | number,
    endValue: string | number,
): TimeRangeInput {
    return {
        start: normalizeStoredTimeRangeExpression(startValue),
        end: normalizeStoredTimeRangeExpression(endValue),
    };
}

function normalizeStoredTimeRangeExpression(value: string | number): string {
    return typeof value === 'number'
        ? formatAbsoluteTimeExpression(value)
        : value.trim();
}

export function normalizePersistedTimeExpression(
    value: unknown,
): string | undefined {
    if (typeof value === 'string') {
        return value;
    }

    const sRangeValue = asRecord(value);
    if (!sRangeValue) {
        return undefined;
    }

    const sKind = sRangeValue.kind;

    if (sKind === 'empty') {
        return '';
    }

    if (sKind === 'absolute' && typeof sRangeValue.timestamp === 'number') {
        return formatAbsoluteTimeExpression(sRangeValue.timestamp);
    }

    if (sKind === 'now' || sKind === 'last') {
        return formatLegacyAnchoredExpression(sKind, sRangeValue);
    }

    if (
        sKind === 'relative' &&
        (sRangeValue.anchor === 'now' || sRangeValue.anchor === 'last')
    ) {
        return formatLegacyAnchoredExpression(sRangeValue.anchor, sRangeValue);
    }

    return undefined;
}

function formatLegacyAnchoredExpression(
    anchor: 'now' | 'last',
    rangeValue: Record<string, unknown>,
): string {
    if (typeof rangeValue.offsetMilliseconds === 'number') {
        return formatRelativeTimeExpression(
            anchor,
            Math.max(rangeValue.offsetMilliseconds, 0),
            TimeUnit.Millisecond,
        );
    }

    if (typeof rangeValue.amount === 'number') {
        const sUnit =
            typeof rangeValue.unit === 'string'
                ? normalizeStoredTimeUnit(rangeValue.unit) ?? TimeUnit.Millisecond
                : TimeUnit.Millisecond;

        return formatRelativeTimeExpression(anchor, rangeValue.amount, sUnit);
    }

    return anchor;
}
