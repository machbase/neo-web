// security key repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334 phase 4).
//
// list/delete are migrated to RPC (`key.list`/`key.delete`), but **generate stays on REST**:
// the RPC `key.generate(id)` takes only an id, fixes the validity period to 10 years
// (ignoring notBefore/notAfter), and returns only {id, certificate, key, token} — no
// serverKey or zip. That breaks the create UI (validity period + *.zip download +
// serverKey display), so keep POST /api/keys until the backend key.generate is enhanced.
import request from '@/api/core';
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

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
    [key: string]: string | number;
    name: string;
    notBefore: number;
    notAfter: number;
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
 * Gen security key — ⚠️ stays on REST (the RPC `key.generate` lacks validity period / serverKey / zip support).
 * @Data {name, notBefore, notAfter}
 * @returns gen key info (certificate/privateKey/serverKey/token/zip)
 */
export const genKey = (aData: CreatePayloadType): Promise<GenKeyResType> => {
    return request({
        method: 'POST',
        url: `/api/keys`,
        data: aData,
    });
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
