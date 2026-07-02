// security key repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334).
//
// list/delete/generate are all on RPC now (`key.list`/`key.delete`/`key.generate`).
// `key.generate(id, typ, notBefore, notAfter, store)` (params order: [id, typ, notBefore, notAfter, store]).
//   - typ: 'ecdsa' | 'rsa'
//   - notBefore / notAfter: unix seconds from the create form's Valid After / Valid Before date pickers; 0 = now / now+10y (server default).
//   - store: when true the key is persisted server-side (appears in key.list).
// Result: always { id, certificate, key, token } (key == privateKey). When store=true the result ALSO
// includes `serverKey` (server certificate PEM) and `zip` (base64 string; Go []byte → JSON std base64).
// The zip bundles server.pem, {id}_cert.pem, {id}_key.pem, {id}_token.txt. When store=false there is no
// serverKey in the result, so genKey falls back to `server.certificate.get` to keep the mTLS serverKey
// display, and zip is empty (no zip download for unstored keys).
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';
import { rpcServerCertificateGet } from './server';

export interface KeyItemType {
    id: string;
    idx: number;
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
    [key: string]: string | boolean | undefined;
    success: boolean;
    elapse: string;
    reason: string;
    // TOKEN_INFO
    certificate: string;
    privateKey: string;
    serverKey: string;
    token: string;
    zip: string;
    name?: string | undefined;
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
 * The RPC result is `KeyInfo[]` ({id, notBefore, notAfter}). idx is not in the RPC, so fill it from the array index.
 */
export const getKeyList = async (): Promise<KeyListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.key.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: KeyItemType[] = rows.map((it, i) => ({
            id: it?.id ?? it?.Id ?? '',
            idx: i,
            notBefore: Number(it?.notBefore ?? it?.NotBefore ?? 0),
            notAfter: Number(it?.notAfter ?? it?.NotAfter ?? 0),
        }));
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};

/**
 * Gen security key — `key.generate(id, typ, notBefore, notAfter, store)`
 * (params order: [id, typ, notBefore, notAfter, store]).
 * notBefore/notAfter are unix seconds (0 = server default: now / now+10y). The RPC returns
 * { id, certificate, key, token } (key == privateKey), plus `serverKey` and `zip` (base64) WHEN store=true.
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
        certificate: '',
        privateKey: '',
        serverKey: '',
        token: '',
        zip: '',
    });
    try {
        const res = await rpcCall<{ id?: string; certificate?: string; key?: string; token?: string; serverKey?: string; zip?: string }>(
            RpcMethod.key.generate,
            [aData.name, String(aData.type).toLowerCase(), Number(aData.notBefore) || 0, Number(aData.notAfter) || 0, Boolean(aData.store)]
        );
        const err = rpcErrMessage(res);
        if (err) return fail(err);
        const r = (res?.result ?? {}) as { id?: string; certificate?: string; key?: string; token?: string; serverKey?: string; zip?: string };
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
            certificate: r.certificate ?? '',
            privateKey: r.key ?? '',
            serverKey,
            token: r.token ?? '',
            zip: r.zip ?? '',
        };
    } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Delete security key — `key.delete(id)`.
 */
export const delKey = async (aTargetKeyName: string): Promise<DelKeyResType> => {
    try {
        const res = await rpcCall(RpcMethod.key.delete, [aTargetKeyName]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err, elapse: '' } : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '' };
    }
};
