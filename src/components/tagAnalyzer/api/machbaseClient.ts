import request from '@/api/core';
import { getErrorMessageFromValue } from '../errorMessage';
import { isPlainObject } from '../objectGuards';

export type QueryResponse = {
    rows: unknown[];
    columns: unknown[] | undefined;
};

type QueryResponseEnvelope = {
    status?: unknown;
    statusText?: unknown;
    success?: unknown;
    data?: unknown;
    reason?: unknown;
    message?: unknown;
    error?: unknown;
};

export function requestSqlQuery(sql: string, signal?: AbortSignal): Promise<unknown> {
    return request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sql)}`,
        ...(signal ? { signal } : {}),
    });
}

export function parseQueryResponse(
    response: unknown,
    requestFailureMessage: string,
    malformedRowsMessage = requestFailureMessage,
): QueryResponse {
    if (!isPlainObject(response)) {
        throw new Error(requestFailureMessage);
    }

    const responseEnvelope: QueryResponseEnvelope = response;
    const hasHttpError: boolean =
        typeof responseEnvelope.status === 'number' &&
        responseEnvelope.status >= 400;

    if (hasHttpError || responseEnvelope.success !== true) {
        const errorMessage: string | undefined =
            getResponseErrorMessage(responseEnvelope);
        throw new Error(
            errorMessage ??
                (hasHttpError
                    ? `Request failed (${responseEnvelope.status})`
                    : requestFailureMessage),
        );
    }

    if (
        !isPlainObject(responseEnvelope.data) ||
        !Array.isArray(responseEnvelope.data.rows)
    ) {
        throw new Error(malformedRowsMessage);
    }

    return {
        rows: responseEnvelope.data.rows,
        columns: Array.isArray(responseEnvelope.data.columns)
            ? responseEnvelope.data.columns
            : undefined,
    };
}

function getResponseErrorMessage(
    response: QueryResponseEnvelope,
): string | undefined {
    return getOptionalErrorMessageFromValue(response.data) ??
        getOptionalErrorMessageFromValue({
            reason: response.reason,
            message: response.message,
            error: response.error,
        }) ??
        (typeof response.statusText === 'string'
            ? response.statusText
            : undefined);
}

function getOptionalErrorMessageFromValue(value: unknown): string | undefined {
    const message = getErrorMessageFromValue(value);
    return message && message !== '{}' ? message : undefined;
}

export function getUnknownErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    return getOptionalErrorMessageFromValue(error)?.trim() || fallbackMessage;
}
