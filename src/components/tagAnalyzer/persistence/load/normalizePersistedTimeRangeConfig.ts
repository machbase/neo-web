import {
    createAbsoluteTimeBoundary,
    createAnchoredTimeBoundary,
    createEmptyTimeBoundary,
} from '../../domain/time/boundary/TimeBoundaryInput';
import {
    TimeUnit,
    type LastTimeBoundary,
    type NowTimeBoundary,
    type TimeBoundary,
    type TimeRangeConfig,
} from '../../domain/time/model/TimeTypes';
import {
    getTimeUnitMilliseconds,
    normalizeStoredTimeUnit,
} from '../../domain/time/interval/TimeIntervalUtils';
import { createTimeRangeConfig } from '../../domain/time/range/TimeRangeUtils';

type PersistedBoundaryRecord = Record<string, unknown>;

const PREFERRED_RELATIVE_UNITS: TimeUnit[] = [
    TimeUnit.Year,
    TimeUnit.Month,
    TimeUnit.Week,
    TimeUnit.Day,
    TimeUnit.Hour,
    TimeUnit.Minute,
    TimeUnit.Second,
    TimeUnit.Millisecond,
];

export function normalizePersistedTimeRangeConfig(
    rangeConfig: unknown,
): TimeRangeConfig | undefined {
    if (!rangeConfig || typeof rangeConfig !== 'object') {
        return undefined;
    }

    const sRangeConfig = rangeConfig as Record<string, unknown>;
    const sStartBoundary = normalizePersistedTimeBoundary(sRangeConfig.start);
    const sEndBoundary = normalizePersistedTimeBoundary(sRangeConfig.end);

    if (!sStartBoundary || !sEndBoundary) {
        return undefined;
    }

    return createTimeRangeConfig(sStartBoundary, sEndBoundary);
}

function normalizePersistedTimeBoundary(boundary: unknown): TimeBoundary | undefined {
    if (!boundary || typeof boundary !== 'object') {
        return undefined;
    }

    const sBoundary = boundary as PersistedBoundaryRecord;
    const sKind = sBoundary.kind;

    if (sKind === 'empty') {
        return createEmptyTimeBoundary();
    }

    if (sKind === 'absolute' && typeof sBoundary.timestamp === 'number') {
        return createAbsoluteTimeBoundary(sBoundary.timestamp);
    }

    if (
        (sKind === 'now' || sKind === 'last') &&
        typeof sBoundary.offsetMilliseconds === 'number'
    ) {
        return createAnchoredBoundaryFromOffset(
            sKind,
            sBoundary.offsetMilliseconds,
        );
    }

    if (
        (sKind === 'now' || sKind === 'last') &&
        typeof sBoundary.amount === 'number' &&
        (sBoundary.unit === undefined || typeof sBoundary.unit === 'string')
    ) {
        return createAnchoredBoundary(sKind, {
            amount: sBoundary.amount,
            unit: sBoundary.unit,
        });
    }

    if (
        sKind === 'relative' &&
        (sBoundary.anchor === 'now' || sBoundary.anchor === 'last') &&
        typeof sBoundary.amount === 'number' &&
        (sBoundary.unit === undefined || typeof sBoundary.unit === 'string')
    ) {
        return createAnchoredBoundary(sBoundary.anchor, {
            amount: sBoundary.amount,
            unit: sBoundary.unit,
        });
    }

    return undefined;
}

function createAnchoredBoundary(
    kind: 'now' | 'last',
    boundary: {
        amount: number;
        unit: string | undefined;
    },
): NowTimeBoundary | LastTimeBoundary {
    const sBaseBoundary = normalizeRelativeBoundaryParts(
        boundary.amount,
        boundary.unit,
    );

    return createAnchoredTimeBoundary(kind, sBaseBoundary.amount, sBaseBoundary.unit);
}

function createAnchoredBoundaryFromOffset(
    kind: 'now' | 'last',
    offsetMilliseconds: number,
): NowTimeBoundary | LastTimeBoundary {
    const sBaseBoundary = normalizeRelativeOffsetMilliseconds(offsetMilliseconds);

    return createAnchoredTimeBoundary(kind, sBaseBoundary.amount, sBaseBoundary.unit);
}

function normalizeRelativeBoundaryParts(
    amount: number,
    unit: string | undefined,
): Pick<NowTimeBoundary, 'amount' | 'unit'> {
    const sNormalizedUnit = unit ? normalizeStoredTimeUnit(unit) : undefined;
    if (amount <= 0 || !sNormalizedUnit) {
        return {
            amount: 0,
            unit: TimeUnit.Millisecond,
        };
    }

    return {
        amount,
        unit: sNormalizedUnit,
    };
}

function normalizeRelativeOffsetMilliseconds(
    offsetMilliseconds: number,
): Pick<NowTimeBoundary, 'amount' | 'unit'> {
    if (offsetMilliseconds <= 0) {
        return {
            amount: 0,
            unit: TimeUnit.Millisecond,
        };
    }

    for (const unit of PREFERRED_RELATIVE_UNITS) {
        const sUnitMilliseconds = getTimeUnitMilliseconds(unit, 1);
        if (offsetMilliseconds % sUnitMilliseconds === 0) {
            return {
                amount: offsetMilliseconds / sUnitMilliseconds,
                unit,
            };
        }
    }

    const sBaseBoundary = {
        amount: offsetMilliseconds,
        unit: TimeUnit.Millisecond,
    };

    return sBaseBoundary;
}

