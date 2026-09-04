// API token repository — machbase-neo UI-API (JSON-RPC), `token.list` / `token.generate` / `token.delete`.
//
// API tokens were split out of `key.generate` by server PR #469. They are an independent credential:
// their own auto-increment `id`, their own expiry, and their own delete — no longer derived from an
// X.509 key pair. The plaintext token is returned ONLY by `token.generate`; `token.list` exposes just
// a `hint` (`nt_<id36>_<first4>****<last4>`), so it can never be recovered after the create response.
//
// `token.generate(name, notAfter)` — note there is NO notBefore: the server pins the start to `now`.
//   - name: required, `TrimSpace !== ''` is the only server-side check. Any character, duplicates allowed.
//   - notAfter: unix seconds; 0 = server default (now + 10y).
// `token.delete(id)` takes the numeric management id, not the name (names are not unique).
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export interface ApiTokenItemType {
    /** management id (auto-increment). This is what `token.delete` takes. */
    id: number;
    /** label. Unconstrained and NOT unique — always identify a token by `id`. */
    name: string;
    /** owning user; `token.list` only ever returns the caller's own tokens. */
    user: string;
    /** masked form, e.g. `nt_5_OKq9****nckI`. The only thing the list ever exposes. */
    hint: string;
    createdAt: number;
    notAfter: number;
    /**
     * `omitempty` on the server: a token that has never authenticated has no such field at all.
     * Keep it undefined rather than coercing to 0, or the UI renders 1970.
     */
    lastUsedAt?: number;
}
/** `token.generate` result — the only place the plaintext token ever appears. */
export interface GenApiTokenResType extends ApiTokenItemType {
    token: string;
}
interface RES_COMMON {
    elapse: string;
    reason: string;
    success: boolean;
}
interface TokenListResType extends RES_COMMON {
    data: ApiTokenItemType[];
}
interface GenTokenResType extends RES_COMMON {
    data?: GenApiTokenResType;
}

const okCommon = (): RES_COMMON => ({ success: true, reason: 'success', elapse: '' });
const errCommon = (msg: string): RES_COMMON => ({ success: false, reason: msg, elapse: '' });

const rpcErrMessage = (res: JsonRpcResponse<unknown>): string | null =>
    res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;

/** Normalize one `ApiTokenInfo` row. `lastUsedAt` stays undefined when the server omits it. */
const toItem = (it: any): ApiTokenItemType => {
    const sLastUsedAt = it?.lastUsedAt;
    return {
        id: Number(it?.id ?? 0),
        name: String(it?.name ?? ''),
        user: String(it?.user ?? ''),
        hint: String(it?.hint ?? ''),
        createdAt: Number(it?.createdAt ?? 0),
        notAfter: Number(it?.notAfter ?? 0),
        lastUsedAt: sLastUsedAt === undefined || sLastUsedAt === null ? undefined : Number(sLastUsedAt),
    };
};

/**
 * Get API token list — `token.list`.
 * The result is `ApiTokenInfo[]`; there is no `idx` (unlike `key.list`) and no plaintext token.
 */
export const getApiTokens = async (): Promise<TokenListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.token.list, []);
        const err = rpcErrMessage(res);
        if (err) return { ...errCommon(err), data: [] };
        const rows = (res?.result ?? []) as any[];
        return { ...okCommon(), data: rows.map(toItem) };
    } catch (e) {
        return { ...errCommon(e instanceof Error ? e.message : String(e)), data: [] };
    }
};

/**
 * Generate an API token — `token.generate(name, notAfter)`.
 * @param aName required; the server only rejects blank/whitespace-only names.
 * @param aNotAfter unix seconds, 0 = server default (now + 10y).
 */
export const genApiToken = async (aName: string, aNotAfter: number): Promise<GenTokenResType> => {
    try {
        const res = await rpcCall<any>(RpcMethod.token.generate, [aName, Number(aNotAfter) || 0]);
        const err = rpcErrMessage(res);
        if (err) return errCommon(err);
        const r = (res?.result ?? {}) as any;
        return { ...okCommon(), data: { ...toItem(r), token: String(r?.token ?? '') } };
    } catch (e) {
        return errCommon(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Delete an API token — `token.delete(id)`. Takes the numeric management id from `token.list`.
 */
export const delApiToken = async (aTokenId: number): Promise<RES_COMMON> => {
    try {
        const res = await rpcCall(RpcMethod.token.delete, [aTokenId]);
        const err = rpcErrMessage(res);
        return err ? errCommon(err) : okCommon();
    } catch (e) {
        return errCommon(e instanceof Error ? e.message : String(e));
    }
};
