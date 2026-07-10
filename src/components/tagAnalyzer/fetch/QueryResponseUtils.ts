// Shared helpers for digging error messages and rows out of /api/query
// response envelopes, whose error shape varies (data string, nested
// reason/message/error, top-level fields, statusText).

export type QueryResponseLike = {
    status?: unknown;
    statusText?: unknown;
    success?: unknown;
    data?: unknown;
    reason?: unknown;
    message?: unknown;
    error?: unknown;
};

export function getQueryResponseErrorMessage(
    response: QueryResponseLike,
    fallbackMessage: string,
): string | undefined {
    if (typeof response.status === 'number' && response.status >= 400) {
        return (
            getResponseErrorMessage(response) ??
            `Request failed (${response.status})`
        );
    }

    if (response.success === false) {
        return getResponseErrorMessage(response) ?? fallbackMessage;
    }

    return undefined;
}

function getResponseErrorMessage(
    response: QueryResponseLike,
): string | undefined {
    const sDataMessage = getOptionalErrorMessageFromValue(response.data);
    if (sDataMessage) {
        return sDataMessage;
    }

    const sTopLevelMessage = getOptionalErrorMessageFromValue({
        reason: response.reason,
        message: response.message,
        error: response.error,
    });
    if (sTopLevelMessage) {
        return sTopLevelMessage;
    }

    return typeof response.statusText === 'string'
        ? response.statusText
        : undefined;
}

function getOptionalErrorMessageFromValue(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    const sMessage = getErrorMessageFromValue(value);
    return sMessage === '{}' ? undefined : sMessage;
}

function getErrorMessageFromValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value);
    }

    if (typeof value !== 'object') {
        return String(value);
    }

    const sMessageContainer = value as {
        reason?: unknown;
        message?: unknown;
        error?: unknown;
    };

    if (sMessageContainer.reason !== undefined) {
        return String(sMessageContainer.reason);
    }

    if (sMessageContainer.message !== undefined) {
        return String(sMessageContainer.message);
    }

    if (sMessageContainer.error !== undefined) {
        return String(sMessageContainer.error);
    }

    const sSerializedValue = JSON.stringify(value);
    return sSerializedValue ?? String(value);
}

export function getQueryRowsOrThrow(
    data: unknown,
    malformedMessage: string,
): unknown[] {
    if (typeof data !== 'object' || data === null || !('rows' in data)) {
        throw new Error(malformedMessage);
    }

    const rows = (data as { rows: unknown }).rows;
    if (!Array.isArray(rows)) {
        throw new Error(malformedMessage);
    }

    return rows;
}

export function getUnknownErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallbackMessage;
}
