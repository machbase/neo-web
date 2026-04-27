import { Toast } from '@/design-system/components';
import type {
    ErrorMessageContainer,
    HttpErrorResponse,
    RequestClientResponse,
    RequestErrorData,
} from './FetchTypes';

/**
 * Checks whether a value is an HTTP error response returned by the request client.
 * Intent: Distinguish failed Axios responses from successful backend payloads that do not include a status code.
 * @param {RequestClientResponse<TData>} value - The candidate response value.
 * @returns {boolean} True when the value matches the HTTP error response shape.
 */
function isHttpErrorResponse<TData>(
    value: RequestClientResponse<TData>,
): value is HttpErrorResponse<RequestErrorData> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    return 'status' in value && typeof value.status === 'number';
}

/**
 * Resolves the display message for a failed HTTP response.
 * Intent: Keep toast text readable when the backend returns nested error objects.
 * @param {HttpErrorResponse<RequestErrorData>} response - The failed HTTP response.
 * @returns {string} The message to display in the error toast.
 */
function getRequestErrorMessage(response: HttpErrorResponse<RequestErrorData>): string {
    const sData = response.data;

    if (
        typeof sData === 'string' ||
        typeof sData === 'number' ||
        typeof sData === 'boolean'
    ) {
        return String(sData);
    }

    if (typeof sData === 'object' && sData !== null) {
        const sMessageContainer = sData as ErrorMessageContainer;

        if (sMessageContainer.reason !== undefined) {
            return String(sMessageContainer.reason);
        }

        if (sMessageContainer.message !== undefined) {
            return String(sMessageContainer.message);
        }

        const sSerializedData = JSON.stringify(sData);
        if (sSerializedData) {
            return sSerializedData;
        }
    }

    if (response.statusText) {
        return response.statusText;
    }

    return `Request failed (${response.status})`;
}

/**
 * Shows a shared request error toast for failed repository responses.
 * Intent: Keep fetch-layer error presentation consistent across the tag analyzer modules.
 * @param {RequestClientResponse<TData>} response - The response candidate returned by the request client.
 * @returns {void} Nothing.
 */
export function showRequestError<TData>(response: RequestClientResponse<TData>): void {
    if (!isHttpErrorResponse(response) || response.status < 400) {
        return;
    }

    Toast.error(getRequestErrorMessage(response));
}
