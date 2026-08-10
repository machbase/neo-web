import type { AxisRange } from '../range/rangeModel';

export function buildRequestKey(parts: Record<string, unknown>): string {
    return JSON.stringify(parts);
}

export function buildRangeRequestKey(
    baseKey: string,
    range: AxisRange,
    details: Record<string, unknown> = {},
): string {
    return buildRequestKey({ baseKey, range, ...details });
}
