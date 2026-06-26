// security key repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334).
//
// list/delete/generate are all on RPC now (`key.list`/`key.delete`/`key.generate`).
// `key.generate(id, type, store)` fixes the validity period to 10 years (no notBefore/notAfter), so the
// create form drops the validity inputs and adds key-type + store options. It returns only
// {id, certificate, key, token} — no zip (zip download removed) and no serverKey, so genKey fetches the
// server certificate separately via `server.certificate.get` to keep the mTLS serverKey display.
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
 * Gen security key — `key.generate(id, type, store)` (params order: [id, type, store]).
 * The RPC returns { id, certificate, key, token } (key == privateKey); validity is fixed to 10 years
 * server-side and there is no zip. serverKey is not in the response, so the server certificate is fetched
 * separately via `server.certificate.get` (best-effort) and merged in to keep the mTLS serverKey display.
 * @aData { name, type ('rsa'|'ecdsa'), store }
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
        const res = await rpcCall<{ certificate?: string; key?: string; token?: string }>(RpcMethod.key.generate, [
            aData.name,
            String(aData.type).toLowerCase(),
            Boolean(aData.store),
        ]);
        const err = rpcErrMessage(res);
        if (err) return fail(err);
        const r = (res?.result ?? {}) as { certificate?: string; key?: string; token?: string };
        // serverKey is not part of key.generate; fetch the server certificate separately for mTLS trust.
        let serverKey = '';
        try {
            const certRes = await rpcServerCertificateGet();
            if (!certRes?.error) serverKey = (certRes?.result as string) ?? '';
        } catch {
            // best-effort: leave serverKey empty if the server certificate cannot be fetched
        }
        return {
            success: true,
            reason: 'success',
            elapse: '',
            certificate: r.certificate ?? '',
            privateKey: r.key ?? '',
            serverKey,
            token: r.token ?? '',
            zip: '',
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
