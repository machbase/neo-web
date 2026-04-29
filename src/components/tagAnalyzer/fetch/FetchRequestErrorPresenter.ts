import { Toast } from '@/design-system/components';
import type {
    ErrorMessageContainer,
    HttpErrorResponse,
    RequestClientResponse,
    RequestErrorData,
} from './FetchTypes';

function isHttpErrorResponse<TData>(
    value: RequestClientResponse<TData>,
): value is HttpErrorResponse<RequestErrorData> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    return 'status' in value && typeof value.status === 'number';
}

function getRequestErrorMessage(response: HttpErrorResponse<RequestErrorData>): string {
    const data = response.data;

    if (
        typeof data === 'string' ||
        typeof data === 'number' ||
        typeof data === 'boolean'
    ) {
        return String(data);
    }

    if (typeof data === 'object' && data !== null) {
        const messageContainer = data as ErrorMessageContainer;

        if (messageContainer.reason !== undefined) {
            return String(messageContainer.reason);
        }

        if (messageContainer.message !== undefined) {
            return String(messageContainer.message);
        }

        const serializedData = JSON.stringify(data);
        if (serializedData) {
            return serializedData;
        }
    }

    if (response.statusText) {
        return response.statusText;
    }

    return `Request failed (${response.status})`;
}

export function showRequestError<TData>(response: RequestClientResponse<TData>): void {
    if (!isHttpErrorResponse(response) || response.status < 400) {
        return;
    }

    Toast.error(getRequestErrorMessage(response));
}
