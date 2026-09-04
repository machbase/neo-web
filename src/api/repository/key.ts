// security key repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334).
//
// list/delete/generate are all on RPC now (`key.list`/`key.delete`/`key.generate`).
// `key.generate(name, typ, notBefore, notAfter, store)` (params order: [name, typ, notBefore, notAfter, store]).
//   - typ: 'ecdsa' | 'rsa'
//   - notBefore / notAfter: unix seconds from the create form's Valid After / Valid Before date pickers; 0 = now / now+10y (server default).
//   - store: when true the key is persisted server-side (appears in key.list).
// Result: { id, name, certificate, key } (key == privateKey). `token` was REMOVED by server PR #469 —
// API tokens are now their own credential under `token.*` (see token.ts), so nothing here carries one.
// When store=true the result ALSO includes `serverKey` (server certificate PEM) and `zip` (base64 string;
// Go []byte → JSON std base64), and `id` is the stored key's management id. The zip bundles server.pem,
// {name}_cert.pem and {name}_key.pem — there is no token file. When store=false the server returns id 0
// with no serverKey and no zip, so genKey falls back to `server.certificate.get` to keep the mTLS
// serverKey display.
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';
import { rpcServerCertificateGet } from './server';

export interface KeyItemType {
    /** management id (auto-increment). This is what `key.delete` takes. */
    id: number;
    idx: number;
    /**
     * certificate CommonName — the value that used to live in `id`.
     * NOT unique (a name may be reused across owners or reissued certs), so always
     * identify a key by `id` and only ever *display* `name`.
     */
    name: string;
    notAfter: number;
    notBefore: number;
}
interface KeyListResType {
    data: KeyItemType[];
    elapse: string;
    reason: string;
    success: boolean;
}
export interface GenKeyResType {
    [key: string]: string | number | boolean | undefined;
    success: boolean;
    elapse: string;
    reason: string;
    /** management id of the stored key. 0 when store=false (nothing was persisted). */
    id: number;
    /** CommonName as the server normalized it (lowercased) — use this, not the raw form input. */
    name: string;
    certificate: string;
    privateKey: string;
    serverKey: string;
    zip: string;
}
export interface CreatePayloadType {
    [key: string]: string | number | boolean;
    name: string;
    type: string; // 'rsa' | 'ecdsa'
    notBefore: number; // unix seconds; 0 = server default (now)
    notAfter: number; // unix seconds; 0 = server default (now + 10y)
    store: boolean;
}
interface DelKeyResType {
    elapse: string;
    reason: string;
    success: boolean;
}

const rpcErrMessage = (res: JsonRpcResponse<unknown>): string | null =>
    res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;

/**
 * Get security key list — `key.list`.
 * The RPC result is `KeyInfo[]` ({idx, id, name, notBefore, notAfter}). `id` is the numeric
 * management id and `name` is the CommonName that used to be sent as `id`; `idx` falls back to
 * the array index when the server omits it.
 */
export const getKeyList = async (): Promise<KeyListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.key.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: KeyItemType[] = rows.map((it, i) => ({
            id: Number(it?.id ?? 0),
            idx: Number(it?.idx ?? i),
            name: String(it?.name ?? ''),
            notBefore: Number(it?.notBefore ?? 0),
            notAfter: Number(it?.notAfter ?? 0),
        }));
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};

/**
 * Gen security key — `key.generate(name, typ, notBefore, notAfter, store)`
 * (params order: [name, typ, notBefore, notAfter, store]).
 * notBefore/notAfter are unix seconds (0 = server default: now / now+10y). The RPC returns
 * { id, name, certificate, key } (key == privateKey), plus `serverKey` and `zip` (base64) WHEN store=true.
 * When store=false the result has no serverKey, so the server certificate is fetched separately via
 * `server.certificate.get` (best-effort) to keep the mTLS serverKey display, and zip is empty.
 * @aData { name, type ('rsa'|'ecdsa'), notBefore, notAfter, store }
 */
export const genKey = async (aData: CreatePayloadType): Promise<GenKeyResType> => {
    const fail = (msg: string): GenKeyResType => ({
        success: false,
        reason: msg,
        elapse: '',
        statusText: msg,
        id: 0,
        name: '',
        certificate: '',
        privateKey: '',
        serverKey: '',
        zip: '',
    });
    try {
        const res = await rpcCall<{ id?: number; name?: string; certificate?: string; key?: string; serverKey?: string; zip?: string }>(
            RpcMethod.key.generate,
            [aData.name, String(aData.type).toLowerCase(), Number(aData.notBefore) || 0, Number(aData.notAfter) || 0, Boolean(aData.store)]
        );
        const err = rpcErrMessage(res);
        if (err) return fail(err);
        const r = (res?.result ?? {}) as { id?: number; name?: string; certificate?: string; key?: string; serverKey?: string; zip?: string };
        // store=true → serverKey & zip are in the result. store=false → fetch the server certificate
        // separately for mTLS trust (no zip without store).
        let serverKey = r.serverKey ?? '';
        if (!serverKey) {
            try {
                const certRes = await rpcServerCertificateGet();
                if (!certRes?.error) serverKey = (certRes?.result as string) ?? '';
            } catch {
                // best-effort: leave serverKey empty if the server certificate cannot be fetched
            }
        }
        return {
            success: true,
            reason: 'success',
            elapse: '',
            id: Number(r.id ?? 0),
            name: String(r.name ?? ''),
            certificate: r.certificate ?? '',
            privateKey: r.key ?? '',
            serverKey,
            zip: r.zip ?? '',
        };
    } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Delete security key — `key.delete(id)`. `id` is the numeric management id from `key.list`,
 * not the key name; the server rejects a string with JSON-RPC -32602.
 */
export const delKey = async (aKeyId: number): Promise<DelKeyResType> => {
    try {
        const res = await rpcCall(RpcMethod.key.delete, [aKeyId]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err, elapse: '' } : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '' };
    }
};
