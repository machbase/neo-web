import axios from 'axios';

export type FileRequestFailure = { reason: string; transport: boolean };

// tag check, not instanceof: an ArrayBuffer from another realm (worker, test env) is still bytes
const isBytes = (aValue: unknown): aValue is ArrayBuffer | ArrayBufferView =>
    Object.prototype.toString.call(aValue) === '[object ArrayBuffer]' || ArrayBuffer.isView(aValue);

const hasOwn = (aValue: unknown, aKey: string) => typeof aValue === 'object' && aValue !== null && Object.prototype.hasOwnProperty.call(aValue, aKey);

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
        let sData = aRes.data;
        // image paths ask for responseType 'arraybuffer', so an error body arrives as bytes too (r20 L5)
        if (isBytes(sData)) {
            try {
                sData = new TextDecoder().decode(sData as ArrayBuffer);
            } catch {
                sData = undefined;
            }
        }
        if (typeof sData === 'string') {
            try {
                sData = JSON.parse(sData);
            } catch {
                // keep raw string
            }
        }
        const sReason = (sData && typeof sData === 'object' && sData.reason) || aRes.statusText || aFallback;
        return { reason: String(sReason), transport: false };
    }
    if (typeof aRes === 'object' && aRes.success === false) return { reason: String(aRes.reason || aFallback), transport: false };
    if (typeof aRes === 'object' && aRes.success === true) return null;
    // unknown object shape without a success flag — treat as success (e.g. parsed JSON file content)
    return null;
};
