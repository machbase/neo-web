export function getErrorMessageFromValue(value: unknown): string {
    return getNestedErrorMessage(value, new Set()) ?? '';
}

function getNestedErrorMessage(
    value: unknown,
    seenValues: Set<object>,
): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (typeof value !== 'object') {
        return String(value);
    }

    if (seenValues.has(value)) {
        return undefined;
    }
    seenValues.add(value);

    const sMessageContainer = value as Record<string, unknown>;
    for (const sKey of ['reason', 'message', 'error']) {
        const sMessage = getNestedErrorMessage(
            sMessageContainer[sKey],
            seenValues,
        );
        if (sMessage) return sMessage;
    }

    try {
        return JSON.stringify(value) ?? safelyStringifyValue(value);
    } catch {
        return safelyStringifyValue(value);
    }
}

function safelyStringifyValue(value: unknown): string | undefined {
    try {
        return String(value);
    } catch {
        return undefined;
    }
}
