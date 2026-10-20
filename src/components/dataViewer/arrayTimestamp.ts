/** ARRAY JSON rows carry DATETIME as integer nanoseconds, regardless of digit count. */
export type ArrayTimeUnit = 'ns';

export function arrayTimestampNanoseconds(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value !== 'string' || !/^-?\d+$/.test(value)) throw new Error('Invalid ARRAY nanosecond timestamp.');
    return BigInt(value);
}

export function arrayTimestampMilliseconds(value: unknown): number {
    return Number(arrayTimestampNanoseconds(value) / 1_000_000n);
}

export function arrayTimestampIso(value: unknown): string {
    return new Date(arrayTimestampMilliseconds(value)).toISOString();
}
