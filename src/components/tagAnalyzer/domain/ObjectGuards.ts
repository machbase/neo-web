// Shared structural guards for narrowing `unknown` values (persisted JSON, API responses).

export function isPlainObject(
    value: unknown,
): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(
    value: unknown,
): Record<string, unknown> | undefined {
    return isPlainObject(value) ? value : undefined;
}
