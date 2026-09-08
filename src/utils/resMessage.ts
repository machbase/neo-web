/**
 * Pull a human-readable message out of a FAILED repository response.
 *
 * The repositories do not agree on where the message lands, so a fallback chain is required:
 *   - bridge.ts / timer.ts / sshKey.ts  → `errEnvelope` fills reason + data.reason + statusText
 *   - key.ts / token.ts                 → `reason` only
 *   - api.ts `shellRpcEnvelope`         → data.reason + statusText only; it deliberately leaves
 *                                         top-level `reason` UNSET (see the comment there), so a
 *                                         `res.reason`-only reader silently gets nothing for
 *                                         shell.add / shell.copy / shell.update failures.
 *
 * Success envelopes carry `reason: 'success'`, which is never a message worth showing — it is
 * filtered out so an accidental call on a success response degrades to the fallback rather than
 * printing "success" in an error toast.
 *
 * Only meaningful on failures; callers guard with `if (!res.success)`.
 */
export const resMessage = (aRes: any, aFallback: string): string => {
    const sRaw = aRes?.reason ?? aRes?.data?.reason ?? aRes?.statusText;
    if (typeof sRaw !== 'string') return aFallback;
    const sMsg = sRaw.trim();
    return sMsg === '' || sMsg === 'success' ? aFallback : sMsg;
};
