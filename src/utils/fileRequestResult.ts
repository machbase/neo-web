import axios from 'axios';

export type FileRequestFailure = { reason: string; transport: boolean };

// tag check, not instanceof: an ArrayBuffer from another realm (worker, test env) is still bytes
const isBytes = (aValue: unknown): aValue is ArrayBuffer | ArrayBufferView =>
    Object.prototype.toString.call(aValue) === '[object ArrayBuffer]' || ArrayBuffer.isView(aValue);

const hasOwn = (aValue: unknown, aKey: string) => typeof aValue === 'object' && aValue !== null && Object.prototype.hasOwnProperty.call(aValue, aKey);

/** HTTP errors on image paths carry the same Neo JSON envelope as bytes. */
export const getFileResponseBody = (response: any): any => {
    let data = response?.data ?? response;
    if (isBytes(data)) {
        try { data = new TextDecoder().decode(data as ArrayBuffer); }
        catch { return undefined; }
    }
    if (typeof data === 'string') {
        try { return JSON.parse(data); }
        catch { return data; }
    }
    return data;
};

/**
 * The request layer (src/api/core) never rejects: an HTTP error resolves to `error.response`
 * (`{ data: { success:false, reason }, status, headers }`) and a network failure resolves to the
 * AxiosError itself. Callers must therefore judge the resolved value. Returns null on success.
 *
 * - AxiosError                         → transport failure
 * - HTTP error response (has headers)  → server failure, reason from `data.reason` (an ArrayBuffer body is decoded)
 * - `{ success:false, reason }` body   → server failure
 * - ArrayBuffer / Blob / string body   → binary or text success (e.g. image move/rename)
 * - `{ success:true }`                 → success
 */
export const getFileRequestFailure = (aRes: any, aFallback: string = 'Request failed.'): FileRequestFailure | null => {
    if (aRes === undefined || aRes === null) return { reason: aFallback, transport: true };
    if (axios.isAxiosError(aRes)) return { reason: (aRes as any).message || aFallback, transport: true };
    if (aRes instanceof ArrayBuffer || (typeof Blob !== 'undefined' && aRes instanceof Blob) || typeof aRes === 'string') return null;
    if (hasOwn(aRes, 'headers') && hasOwn(aRes, 'status')) {
        if (typeof aRes.status === 'number' && aRes.status >= 200 && aRes.status < 300) return null;
        const sData = getFileResponseBody(aRes);
        const sReason = (sData && typeof sData === 'object' && sData.reason) || aRes.statusText || aFallback;
        return { reason: String(sReason), transport: false };
    }
    if (typeof aRes === 'object' && aRes.success === false) return { reason: String(aRes.reason || aFallback), transport: false };
    if (typeof aRes === 'object' && aRes.success === true) return null;
    // unknown object shape without a success flag — treat as success (e.g. parsed JSON file content)
    return null;
};

/** A POST acknowledgement needs an explicit success flag as well as a valid response. */
export const isSuccessfulFileWrite = (response: any): boolean =>
    !getFileRequestFailure(response) && (response?.success === true || response?.data?.success === true);

/**
 * Why a dashboard panel's chart request failed, or null when it can be drawn. A refused query comes
 * back as a body with `reason`, as an HTTP error, or as a transport failure; the last two used to pass
 * as a success with no chart data, so a failed Refresh left every panel blank and silent (#1565).
 */
export const getChartRequestFailureReason = (aRes: any): string | null => {
    if (aRes?.data?.reason) return String(aRes.data.reason);
    return getFileRequestFailure(aRes, 'Failed to load the chart.')?.reason ?? null;
};
