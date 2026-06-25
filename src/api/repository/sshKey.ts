// ssh key repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334 phase 4).
// The external signatures and return shapes (RES_SSHKEY/RES_COMMON) are kept as-is;
// only the internals are swapped to the `sshkey.list/add/delete` RPCs, adapting the
// result back into the existing REST envelope.
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export interface SSHKEY_ITEM_TYPE {
    keyType: string;
    fingerprint: string;
    comment: string;
}
interface RES_COMMON {
    elapse: string;
    reason: string;
    success: boolean;
}
interface RES_SSHKEY extends RES_COMMON {
    data: SSHKEY_ITEM_TYPE[];
}

const okCommon = (): RES_COMMON => ({ success: true, reason: 'success', elapse: '' });
// Call sites read `.data.reason` or `.statusText` on failure, so fill both.
const errCommon = (msg: string): RES_COMMON & { data: { reason: string }; statusText: string } => ({
    success: false,
    reason: msg,
    elapse: '',
    data: { reason: msg },
    statusText: msg,
});

const rpcErrMessage = (res: JsonRpcResponse<unknown>): string | null =>
    res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;

/**
 * Get ssh key list — `sshkey.list`.
 * The RPC result is `AuthorizedSshKey[]` (may be PascalCase since it has no json tags),
 * so normalize to camelCase and convert into the existing `{ success, data }` envelope.
 */
export const getSSHKeys = async (): Promise<RES_SSHKEY> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.sshkey.list, []);
        const err = rpcErrMessage(res);
        if (err) return { ...errCommon(err), data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: SSHKEY_ITEM_TYPE[] = rows.map((it) => ({
            keyType: it?.keyType ?? it?.KeyType ?? '',
            fingerprint: it?.fingerprint ?? it?.Fingerprint ?? '',
            comment: it?.comment ?? it?.Comment ?? '',
        }));
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { ...errCommon(e instanceof Error ? e.message : String(e)), data: [] };
    }
};

/**
 * Add ssh key — `sshkey.add(keyType, key, comment)`.
 * @param aSSHKeyPub a "type key comment" formatted string (the call site builds it this way).
 *        The RPC needs 3 positional args, so split on whitespace before passing.
 */
export const addSSHKey = async (aSSHKeyPub: string): Promise<RES_COMMON> => {
    const parts = aSSHKeyPub.trim().split(/\s+/);
    const keyType = parts[0] ?? '';
    const key = parts[1] ?? '';
    const comment = parts.slice(2).join(' ');
    try {
        const res = await rpcCall(RpcMethod.sshkey.add, [keyType, key, comment]);
        const err = rpcErrMessage(res);
        return err ? errCommon(err) : okCommon();
    } catch (e) {
        return errCommon(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Delete ssh key — `sshkey.delete(fingerprint)`.
 */
export const delSSHKey = async (aFingerPrt: string): Promise<RES_COMMON> => {
    try {
        const res = await rpcCall(RpcMethod.sshkey.delete, [aFingerPrt]);
        const err = rpcErrMessage(res);
        return err ? errCommon(err) : okCommon();
    } catch (e) {
        return errCommon(e instanceof Error ? e.message : String(e));
    }
};
