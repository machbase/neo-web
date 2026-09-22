import { formatTimeUnitShortCode } from '../rangeExpression/expressionFormat';
import { isFiniteNumber, isPlainObject } from '../objectGuards';
import { TimeUnit } from '../rangeExpression/intervalResolver';
import { createNonEmptyAxisRange } from '../rangeExpression/rangeBuilder';
import type { AxisRange } from '../rangeExpression/rangeModel';

export type PersistedAxisRange = {
    startTime: number;
    endTime: number;
};

const TIME_UNIT_BY_PERSISTED_VALUE = new Map<string, TimeUnit>(
    Object.values(TimeUnit).flatMap((unit) => [
        [unit, unit] as const,
        [formatTimeUnitShortCode(unit), unit] as const,
    ]).concat([
        ['second', TimeUnit.Second],
        ['minute', TimeUnit.Minute],
    ]),
);

export function decodePersistedTimeUnit(value: unknown): TimeUnit | undefined {
    return typeof value === 'string'
        ? TIME_UNIT_BY_PERSISTED_VALUE.get(value)
        : undefined;
}

export function decodeAxisRange(value: unknown): AxisRange | undefined {
    if (!isPlainObject(value)) return undefined;

    const { startTime, endTime } = value;
    if (!isFiniteNumber(startTime) || !isFiniteNumber(endTime)) {
        return undefined;
    }

    return createNonEmptyAxisRange(startTime, endTime);
}

export function encodeAxisRange(range: AxisRange): PersistedAxisRange {
    return {
        startTime: range.start,
        endTime: range.end,
    };
}
